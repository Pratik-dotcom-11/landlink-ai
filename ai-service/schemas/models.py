"""
Data models and schema definitions for the AI/OCR Land Record Digitization Pipeline.
Adheres strictly to database/schema.sql and docs/architecture.md specifications.
"""
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ConfidenceTier(str, Enum):
    HIGH = "HIGH"        # >= 0.85
    MEDIUM = "MEDIUM"    # 0.60 - 0.84
    LOW = "LOW"          # < 0.60


class DocumentStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PREPROCESSING = "PREPROCESSING"
    OCR_PROCESSING = "OCR_PROCESSING"
    OCR_COMPLETED = "OCR_COMPLETED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    VERIFIED_APPROVED = "VERIFIED_APPROVED"
    REJECTED = "REJECTED"


class SupportedLanguage(str, Enum):
    ENGLISH = "en"
    HINDI = "hi"
    BENGALI = "bn"
    # Extensible for future Indian languages (Marathi, Tamil, Telugu, Gujarati, Odia, etc.)
    MARATHI = "mr"
    GUJARATI = "gu"
    TAMIL = "ta"
    TELUGU = "te"
    KANNADA = "kn"
    MALAYALAM = "ml"
    ODIA = "or"
    PUNJABI = "pa"


@dataclass
class BoundingBox:
    x: float = 0.0          # Normalized 0.0 to 100.0% of page width
    y: float = 0.0          # Normalized 0.0 to 100.0% of page height
    width: float = 0.0      # Normalized width percentage
    height: float = 0.0     # Normalized height percentage
    page: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "width": round(self.width, 2),
            "height": round(self.height, 2),
            "page": self.page
        }


@dataclass
class FieldSourceReference:
    page_number: int = 1
    bounding_box: Optional[BoundingBox] = None
    line_number: Optional[int] = None
    raw_context_snippet: Optional[str] = None
    matched_keyword: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "bounding_box": self.bounding_box.to_dict() if self.bounding_box else None,
            "line_number": self.line_number,
            "raw_context_snippet": self.raw_context_snippet,
            "matched_keyword": self.matched_keyword,
        }


@dataclass
class ExtractedField:
    """
    Standardized representation of an extracted land record attribute.
    Ensures that value, confidence, source reference, and verification requirement
    are always rigorously reported.
    """
    field_key: str
    field_label: str
    value: Optional[Any] = None
    raw_value: Optional[str] = None
    confidence: float = 0.0
    confidence_tier: ConfidenceTier = ConfidenceTier.LOW
    source: Optional[FieldSourceReference] = None
    verification_required: bool = True
    data_type: str = "STRING"
    validation_notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_key": self.field_key,
            "field_label": self.field_label,
            "value": self.value,
            "raw_value": self.raw_value,
            "confidence": round(self.confidence, 4),
            "confidence_tier": self.confidence_tier.value,
            "source": self.source.to_dict() if self.source else None,
            "verification_required": self.verification_required,
            "data_type": self.data_type,
            "validation_notes": self.validation_notes
        }


@dataclass
class AreaExtraction:
    value: Optional[float] = None
    unit: Optional[str] = None
    standardized_hectares: Optional[float] = None
    standardized_acres: Optional[float] = None
    raw_text: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": self.value,
            "unit": self.unit,
            "standardized_hectares": round(self.standardized_hectares, 4) if self.standardized_hectares is not None else None,
            "standardized_acres": round(self.standardized_acres, 4) if self.standardized_acres is not None else None,
            "raw_text": self.raw_text
        }


@dataclass
class MutationExtraction:
    mutation_number: Optional[str] = None
    mutation_date: Optional[str] = None
    order_authority: Optional[str] = None
    transfer_type: Optional[str] = None  # e.g., 'Inheritance / Varas', 'Sale Deed', 'Partition'
    remarks: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mutation_number": self.mutation_number,
            "mutation_date": self.mutation_date,
            "order_authority": self.order_authority,
            "transfer_type": self.transfer_type,
            "remarks": self.remarks
        }


@dataclass
class RegistrationExtraction:
    deed_number: Optional[str] = None
    registration_date: Optional[str] = None
    sub_registrar_office: Optional[str] = None
    book_volume_page: Optional[str] = None
    stamp_duty_paid: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "deed_number": self.deed_number,
            "registration_date": self.registration_date,
            "sub_registrar_office": self.sub_registrar_office,
            "book_volume_page": self.book_volume_page,
            "stamp_duty_paid": self.stamp_duty_paid
        }


@dataclass
class ProcessingMetrics:
    total_processing_time_ms: float = 0.0
    preprocessing_time_ms: float = 0.0
    ocr_time_ms: float = 0.0
    extraction_time_ms: float = 0.0
    validation_time_ms: float = 0.0
    pages_processed: int = 1
    total_characters_extracted: int = 0
    words_extracted: int = 0
    engine_name: str = "DoLR-Multimodal-IndicOCR-v1.0"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_processing_time_ms": round(self.total_processing_time_ms, 2),
            "preprocessing_time_ms": round(self.preprocessing_time_ms, 2),
            "ocr_time_ms": round(self.ocr_time_ms, 2),
            "extraction_time_ms": round(self.extraction_time_ms, 2),
            "validation_time_ms": round(self.validation_time_ms, 2),
            "pages_processed": self.pages_processed,
            "total_characters_extracted": self.total_characters_extracted,
            "words_extracted": self.words_extracted,
            "engine_name": self.engine_name
        }


@dataclass
class ValidationRuleAlert:
    rule_code: str
    rule_name: str
    status: str       # 'PASS', 'WARNING', 'FAIL'
    severity: str     # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    message: str
    is_blocking: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_code": self.rule_code,
            "rule_name": self.rule_name,
            "status": self.status,
            "severity": self.severity,
            "message": self.message,
            "is_blocking": self.is_blocking
        }


@dataclass
class ValidationReadyJSON:
    """
    Top-level output schema produced by the AI/OCR Document Processing Pipeline.
    Ready for ingestion by the Validation Engine and persistence into PostgreSQL.
    """
    document_id: str
    filename: str
    file_type: str
    detected_language: str
    script_type: str
    processed_at: str

    # 15 Core Required Land Record Fields
    fields: Dict[str, ExtractedField] = field(default_factory=dict)

    # Complex Structured Sub-Extractions
    area_details: Optional[AreaExtraction] = None
    mutation_details: Optional[MutationExtraction] = None
    registration_details: Optional[RegistrationExtraction] = None

    # Pipeline Governance & Confidence
    overall_confidence: float = 0.0
    overall_confidence_tier: ConfidenceTier = ConfidenceTier.LOW
    requires_human_verification: bool = True
    verification_reasons: List[str] = field(default_factory=list)
    auto_approval_eligible: bool = False

    # Validation Checks & Audit
    validation_alerts: List[ValidationRuleAlert] = field(default_factory=list)
    metrics: ProcessingMetrics = field(default_factory=ProcessingMetrics)
    raw_extracted_text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "filename": self.filename,
            "file_type": self.file_type,
            "detected_language": self.detected_language,
            "script_type": self.script_type,
            "processed_at": self.processed_at,
            "fields": {k: v.to_dict() for k, v in self.fields.items()},
            "area_details": self.area_details.to_dict() if self.area_details else None,
            "mutation_details": self.mutation_details.to_dict() if self.mutation_details else None,
            "registration_details": self.registration_details.to_dict() if self.registration_details else None,
            "overall_confidence": round(self.overall_confidence, 4),
            "overall_confidence_tier": self.overall_confidence_tier.value,
            "requires_human_verification": self.requires_human_verification,
            "verification_reasons": self.verification_reasons,
            "auto_approval_eligible": self.auto_approval_eligible,
            "validation_alerts": [a.to_dict() for a in self.validation_alerts],
            "metrics": self.metrics.to_dict(),
            "raw_extracted_text": self.raw_extracted_text
        }
