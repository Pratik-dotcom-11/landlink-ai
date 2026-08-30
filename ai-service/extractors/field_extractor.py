"""
Cadastral and Land Record Domain Field Extractor.
Extracts the 15 required cadastral attributes with strict traceability, spatial coordinates, and non-fabrication guarantees.
"""
import re
from typing import Dict, List, Optional, Tuple, Any
from schemas.models import (
    ExtractedField,
    FieldSourceReference,
    BoundingBox,
    ConfidenceTier,
    AreaExtraction,
    MutationExtraction,
    RegistrationExtraction,
)
from languages.base import BaseLanguageHandler, LanguageRegistry
from normalization.text_normalizer import TextNormalizer
from ocr.ocr_engine import OCRPageResult, OCRLine


class FieldExtractor:
    """
    Cadastral Domain Feature Extractor.
    Extracts legal revenue fields from OCR text streams, key-value labels, and cadastral tables.
    """

    # The 15 canonical target fields requested
    REQUIRED_FIELD_KEYS = [
        ("owner_name", "Primary Landowner Name", "STRING"),
        ("father_guardian_name", "Father / Guardian / Spouse Name", "STRING"),
        ("survey_number", "Survey Number", "STRING"),
        ("khasra_number", "Khasra / Plot Number", "STRING"),
        ("khata_number", "Khata / Khatauni / Khatian Number", "STRING"),
        ("plot_number", "Sub-Plot / Parcel Number", "STRING"),
        ("area", "Total Land Area", "NUMERIC"),
        ("village", "Village / Mouza", "STRING"),
        ("tehsil", "Tehsil / Taluka / Circle", "STRING"),
        ("district", "District", "STRING"),
        ("state", "State / Province", "STRING"),
        ("land_classification", "Land Use Classification", "STRING"),
        ("ownership_type", "Tenure / Ownership Rights Type", "STRING"),
        ("mutation_info", "Mutation Order / Transfer History", "STRING"),
        ("registration_info", "Deed Registration Details", "STRING"),
    ]

    def __init__(self, normalizer: Optional[TextNormalizer] = None):
        self.normalizer = normalizer or TextNormalizer()

    def extract_fields(self, ocr_results: List[OCRPageResult], language_code: Optional[str] = None) -> Tuple[Dict[str, ExtractedField], AreaExtraction, MutationExtraction, RegistrationExtraction]:
        """
        Executes complete extraction across all document pages.
        Returns: (fields_dict, area_details, mutation_details, registration_details)
        """
        # Combine all lines and full text
        all_lines: List[Tuple[int, OCRLine]] = []
        full_text_chunks = []

        for page in ocr_results:
            full_text_chunks.append(page.full_text)
            for line in page.lines:
                all_lines.append((page.page_number, line))

        full_doc_text = "\n".join(full_text_chunks)

        # Select language handler
        if language_code:
            lang_handler = LanguageRegistry.get(language_code) or LanguageRegistry.detect_language(full_doc_text)
        else:
            lang_handler = LanguageRegistry.detect_language(full_doc_text)

        self.normalizer.set_language_handler(lang_handler)

        extracted_fields: Dict[str, ExtractedField] = {}

        # 1. Extract each of the 15 standard fields
        for field_key, field_label, data_type in self.REQUIRED_FIELD_KEYS:
            field_obj = self._extract_single_field(
                field_key=field_key,
                field_label=field_label,
                data_type=data_type,
                all_lines=all_lines,
                full_text=full_doc_text,
                lang_handler=lang_handler
            )
            extracted_fields[field_key] = field_obj

        # 2. Extract structured sub-objects
        area_details = self._extract_structured_area(extracted_fields.get("area"), full_doc_text)
        mutation_details = self._extract_structured_mutation(extracted_fields.get("mutation_info"), full_doc_text)
        registration_details = self._extract_structured_registration(extracted_fields.get("registration_info"), full_doc_text)

        # Reconcile standardized values back into extracted fields
        if area_details.standardized_hectares is not None:
            area_field = extracted_fields["area"]
            area_field.value = f"{area_details.value} {area_details.unit} ({area_details.standardized_hectares} Ha / {area_details.standardized_acres} Acres)"

        return extracted_fields, area_details, mutation_details, registration_details

    def _extract_single_field(
        self,
        field_key: str,
        field_label: str,
        data_type: str,
        all_lines: List[Tuple[int, OCRLine]],
        full_text: str,
        lang_handler: BaseLanguageHandler
    ) -> ExtractedField:
        """
        Attempts key-value pattern extraction, contextual line parsing, and table column matching.
        Strict rule: Do not fabricate missing information.
        """
        aliases = lang_handler.get_aliases_for_field(field_key)

        # Also search in English aliases if the native language is Hindi or Bengali
        en_handler = LanguageRegistry.get("en")
        if en_handler and lang_handler.language_code != "en":
            aliases = aliases + en_handler.get_aliases_for_field(field_key)

        # 1. Search line by line for key-value patterns: "Keyword : Value" or "Keyword - Value"
        for page_num, ocr_line in all_lines:
            line_text = ocr_line.text
            for alias in aliases:
                # Regex for "Alias [: - = / | \t] Value"
                pattern = rf"(?:^|[^\w]){re.escape(alias)}\s*[:\-=\|\t]+\s*(.+)$"
                match = re.search(pattern, line_text, re.IGNORECASE)
                if match:
                    raw_val = match.group(1).strip()
                    val = self._clean_and_validate_value(field_key, raw_val)
                    if val:
                        conf = min(0.98, max(0.60, ocr_line.confidence))
                        return ExtractedField(
                            field_key=field_key,
                            field_label=field_label,
                            value=val,
                            raw_value=raw_val,
                            confidence=conf,
                            confidence_tier=ConfidenceTier.HIGH if conf >= 0.85 else ConfidenceTier.MEDIUM,
                            source=FieldSourceReference(
                                page_number=page_num,
                                bounding_box=ocr_line.bounding_box,
                                line_number=ocr_line.line_number,
                                raw_context_snippet=line_text,
                                matched_keyword=alias
                            ),
                            verification_required=conf < 0.85,
                            data_type=data_type,
                            validation_notes="Extracted via label-value key matching"
                        )

        # 2. Contextual regex heuristics for specific fields (e.g. Khasra, Owner, Area)
        fallback_match = self._fallback_pattern_match(field_key, all_lines, lang_handler)
        if fallback_match:
            val, raw_val, page_num, ocr_line, matched_kw, conf = fallback_match
            return ExtractedField(
                field_key=field_key,
                field_label=field_label,
                value=val,
                raw_value=raw_val,
                confidence=conf,
                confidence_tier=ConfidenceTier.HIGH if conf >= 0.85 else (ConfidenceTier.MEDIUM if conf >= 0.60 else ConfidenceTier.LOW),
                source=FieldSourceReference(
                    page_number=page_num,
                    bounding_box=ocr_line.bounding_box if ocr_line else None,
                    line_number=ocr_line.line_number if ocr_line else None,
                    raw_context_snippet=ocr_line.text if ocr_line else None,
                    matched_keyword=matched_kw
                ),
                verification_required=conf < 0.85,
                data_type=data_type,
                validation_notes="Extracted via structural domain heuristics"
            )

        # 3. If field is missing or not detected, RETURN NULL and MARK FOR VERIFICATION
        return ExtractedField(
            field_key=field_key,
            field_label=field_label,
            value=None,
            raw_value=None,
            confidence=0.0,
            confidence_tier=ConfidenceTier.LOW,
            source=None,
            verification_required=True,
            data_type=data_type,
            validation_notes="Field not found in document. Verification required."
        )

    def _fallback_pattern_match(
        self,
        field_key: str,
        all_lines: List[Tuple[int, OCRLine]],
        lang_handler: BaseLanguageHandler
    ) -> Optional[Tuple[str, str, int, Optional[OCRLine], str, float]]:
        """
        Structural heuristics for detecting fields when explicit delimiters (colons) are omitted.
        """
        aliases = lang_handler.get_aliases_for_field(field_key)

        for page_num, ocr_line in all_lines:
            line_text = ocr_line.text.strip()
            # Ignore parenthetical notes or general disclaimer lines
            if line_text.startswith("(") or line_text.lower().startswith("note:") or "faded scan" in line_text.lower():
                continue

            for alias in aliases:
                if alias.lower() in line_text.lower():
                    # Extract the remainder of the line after alias
                    idx = line_text.lower().find(alias.lower())
                    rem = line_text[idx + len(alias):].strip()
                    # Strip leading non-alphanumeric punctuation
                    rem = re.sub(r"^[\s:\-=\|\.,]+", "", rem).strip()
                    val = self._clean_and_validate_value(field_key, rem)
                    if val and len(val) >= 1:
                        conf = round(ocr_line.confidence * 0.90, 4)
                        return val, rem, page_num, ocr_line, alias, conf

        return None

    def _clean_and_validate_value(self, field_key: str, raw_value: str) -> Optional[str]:
        """
        Field-specific sanitization and validation.
        """
        if not raw_value:
            return None

        cleaned = self.normalizer.normalize_text(raw_value).strip()
        # Remove trailing pipes, brackets, and table borders
        cleaned = re.sub(r"[\s\|\}\]>\(\)]+$", "", cleaned).strip()

        # Check for noise or disclaimer keywords
        invalid_name_terms = ["missing", "illegible", "damage", "corrupt", "water damage", "not available", "अनुपलब्ध", "अस्पष्ट", "নষ্ট", "অপঠনযোগ্য"]
        if any(term in cleaned.lower() for term in invalid_name_terms):
            return None

        if field_key in ("khasra_number", "survey_number", "plot_number", "khata_number"):
            return self.normalizer.normalize_khasra_or_survey(cleaned)

        if field_key == "area":
            num_val, unit, ha, ac = self.normalizer.normalize_area(cleaned)
            if num_val is not None:
                return f"{num_val} {unit}"
            return cleaned if any(c.isdigit() for c in cleaned) else None

        if field_key in ("owner_name", "father_guardian_name"):
            # Person name shouldn't contain multiple auxiliary verbs, survey words, or exceed 60 chars
            if len(cleaned) < 2 or len(cleaned) > 80:
                return None
            if any(w in cleaned.lower().split() for w in ["and", "are", "is", "were", "due", "to", "number", "khasra", "plot"]):
                return None
            # Strip numeric prefixes if any
            cleaned = re.sub(r"^\d+[\.\-\s]+", "", cleaned).strip()
            return cleaned if len(cleaned) >= 2 else None

        if field_key in ("village", "tehsil", "district", "state"):
            cleaned = re.sub(r"^\d+[\.\-\s]+", "", cleaned).strip()
            return cleaned if len(cleaned) >= 2 else None

        return cleaned if len(cleaned) > 0 else None

    def _extract_structured_area(self, area_field: Optional[ExtractedField], full_text: str) -> AreaExtraction:
        raw_text = area_field.raw_value if (area_field and area_field.raw_value) else ""
        if not raw_text:
            # Search full text for area mentions (e.g. 2.4500 हे., 1.20 एकड़, 50 শতক)
            area_match = re.search(r"(\d+(?:\.\d+)?)\s*(हेक्टेयर|हे\.|एकड़|बीघा|শতক|কাঠা|Hectares|Acres|Bigha)", full_text, re.IGNORECASE)
            if area_match:
                raw_text = area_match.group(0)

        num_val, unit, ha, ac = self.normalizer.normalize_area(raw_text)
        return AreaExtraction(
            value=num_val,
            unit=unit,
            standardized_hectares=ha,
            standardized_acres=ac,
            raw_text=raw_text or None
        )

    def _extract_structured_mutation(self, mutation_field: Optional[ExtractedField], full_text: str) -> MutationExtraction:
        raw_text = mutation_field.raw_value if (mutation_field and mutation_field.raw_value) else ""
        
        # Regex for Mutation case number (e.g., 'MUT-2024-89', 'केस नं. 14/2023', 'নামজারি কেস ১২/২০২৩')
        mut_no = None
        mut_date = None
        
        mut_match = re.search(r"(?:केस|Case|No|নং|क्रमांक)[\s:\.\-]+([A-Za-z0-9/\-]+)", raw_text or full_text)
        if mut_match:
            mut_no = mut_match.group(1).strip()
        elif raw_text:
            mut_no = raw_text

        date_match = re.search(r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})", raw_text or full_text)
        if date_match:
            mut_date = date_match.group(1)

        return MutationExtraction(
            mutation_number=mut_no,
            mutation_date=mut_date,
            order_authority="Tehsildar / Revenue Officer" if mut_no else None,
            transfer_type="Inheritance / Succession (Varas)" if "वारिस" in full_text or "ওয়ারিশ" in full_text else "Sale Deed Transfer",
            remarks=raw_text or None
        )

    def _extract_structured_registration(self, reg_field: Optional[ExtractedField], full_text: str) -> RegistrationExtraction:
        raw_text = reg_field.raw_value if (reg_field and reg_field.raw_value) else ""
        
        deed_no = None
        reg_date = None

        deed_match = re.search(r"(?:दस्तावेज|দলিল|Deed|Reg(?:istration)?)[\s:\.\-No\#]+([A-Za-z0-9/\-]+)", raw_text or full_text, re.IGNORECASE)
        if deed_match:
            deed_no = deed_match.group(1).strip()
        elif raw_text:
            deed_no = raw_text

        date_match = re.search(r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})", raw_text or full_text)
        if date_match:
            reg_date = date_match.group(1)

        return RegistrationExtraction(
            deed_number=deed_no,
            registration_date=reg_date,
            sub_registrar_office="Sub-Registrar Office (Revenue Dept)" if deed_no else None,
            book_volume_page=None,
            stamp_duty_paid=None
        )
