"""
Text Normalization and Indic Script Standardization Module.
Cleans OCR artifacts, normalizes Unicode diacritics/viramas, maps Indic numerals, and standardizes land area metrics.
"""
import unicodedata
import re
from typing import Dict, Any, Optional, Tuple
from languages.base import BaseLanguageHandler, LanguageRegistry


class TextNormalizer:
    """
    Standardizes raw multilingual OCR output into clean, canonical data.
    """

    def __init__(self, language_handler: Optional[BaseLanguageHandler] = None):
        self.language_handler = language_handler or LanguageRegistry.get("hi")

    def set_language_handler(self, handler: BaseLanguageHandler) -> None:
        self.language_handler = handler

    def normalize_text(self, text: str) -> str:
        """
        Applies Unicode normalization (NFKC) and cleans OCR noise.
        """
        if not text:
            return ""

        # 1. Unicode NFKC normalization
        norm = unicodedata.normalize("NFKC", text)

        # 2. Replace weird quotation marks, non-breaking spaces, zero-width characters
        norm = norm.replace("\u200b", "").replace("\u200c", "").replace("\u200d", "").replace("\ufeff", "")
        norm = norm.replace("\u00a0", " ")
        norm = norm.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")

        # 3. Collapse multiple whitespace characters into single space while preserving linebreaks
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in norm.splitlines()]
        cleaned = "\n".join(lines)

        return cleaned

    def normalize_numerals(self, text: str) -> str:
        """
        Converts Devanagari and Bengali digits into standard Arabic digits (0-9).
        """
        if not text:
            return ""
        if self.language_handler:
            return self.language_handler.normalize_numerals(text)
        
        # Fallback multi-script numeral converter
        all_num_map = {
            "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
            "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
        }
        res = text
        for k, v in all_num_map.items():
            res = res.replace(k, v)
        return res

    def normalize_area(self, raw_area_str: str) -> Tuple[Optional[float], Optional[str], Optional[float], Optional[float]]:
        """
        Extracts numeric area, identifies unit, and calculates standardized Hectares and Acres.
        Returns: (numeric_value, unit, hectares, acres)
        """
        if not raw_area_str:
            return None, None, None, None

        # Convert numerals to standard digits
        converted = self.normalize_numerals(raw_area_str)

        # Find first floating point or integer number
        match = re.search(r"(\d+(?:\.\d+)?)", converted)
        if not match:
            return None, None, None, None

        try:
            num_val = float(match.group(1))
        except ValueError:
            return None, None, None, None

        # Detect unit from string or use language default
        detected_unit = "Hectares"
        conversion_factor = 1.0

        if self.language_handler:
            conversions = self.language_handler.area_unit_conversions
            lower_str = raw_area_str.lower()
            for unit_name, factor in conversions.items():
                if unit_name.lower() in lower_str:
                    detected_unit = unit_name
                    conversion_factor = factor
                    break

        hectares = round(num_val * conversion_factor, 4)
        acres = round(hectares * 2.47105, 4)

        return num_val, detected_unit, hectares, acres

    def normalize_khasra_or_survey(self, value: str) -> Optional[str]:
        """
        Normalizes plot numbers, khasra numbers, and survey numbers (e.g., '184 / 2' -> '184/2').
        """
        if not value:
            return None
        converted = self.normalize_numerals(value.strip())
        # Remove internal spaces around slashes or hyphens
        cleaned = re.sub(r"\s*([/\-])\s*", r"\1", converted)
        # Match standard khasra pattern (digits optionally followed by /digits or letters)
        match = re.search(r"(\d+(?:[/\-][\dA-Za-z]+)?)", cleaned)
        if match:
            return match.group(1)
        return None
