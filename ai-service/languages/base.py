"""
Base class and registry for Indic and regional language handlers.
Provides standard interfaces for lexicon keywords, revenue terms, numeral normalization, and script detection.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Pattern, Any, Set, Tuple
import re


class BaseLanguageHandler(ABC):
    """
    Abstract Base Class for language-specific cadastral processing.
    Any new Indian language (e.g. Marathi, Tamil, Telugu, Odia) inherits from this class.
    """

    @property
    @abstractmethod
    def language_code(self) -> str:
        """ISO 639-1 language code (e.g., 'hi', 'bn', 'en')."""
        pass

    @property
    @abstractmethod
    def language_name(self) -> str:
        """Full English name of language (e.g., 'Hindi', 'Bengali')."""
        pass

    @property
    @abstractmethod
    def script_name(self) -> str:
        """Name of the writing script (e.g., 'Devanagari', 'Bengali', 'Latin')."""
        pass

    @property
    @abstractmethod
    def unicode_range(self) -> Tuple[int, int]:
        """Unicode codepoint range for character frequency detection."""
        pass

    @property
    @abstractmethod
    def numeral_map(self) -> Dict[str, str]:
        """Mapping from native script numerals to standard Arabic digits ('0'-'9')."""
        pass

    @property
    @abstractmethod
    def keyword_lexicon(self) -> Dict[str, List[str]]:
        """
        Dictionary mapping standardized field keys to lists of regional keyword aliases.
        Standard keys:
          - 'owner_name'
          - 'father_guardian_name'
          - 'survey_number'
          - 'khasra_number'
          - 'khata_number'
          - 'plot_number'
          - 'area'
          - 'village'
          - 'tehsil'
          - 'district'
          - 'state'
          - 'land_classification'
          - 'ownership_type'
          - 'mutation_info'
          - 'registration_info'
        """
        pass

    @property
    @abstractmethod
    def area_unit_conversions(self) -> Dict[str, float]:
        """
        Conversion factors from regional area units to standard Hectares.
        Example: {'hectare': 1.0, 'acre': 0.404686, 'bigha': 0.2529}
        """
        pass

    def normalize_numerals(self, text: str) -> str:
        """Convert native script digits into standard '0'-'9'."""
        if not text:
            return ""
        result = text
        for native_digit, arabic_digit in self.numeral_map.items():
            result = result.replace(native_digit, arabic_digit)
        return result

    def get_aliases_for_field(self, field_key: str) -> List[str]:
        """Return list of search keywords for a given field."""
        return self.keyword_lexicon.get(field_key, [])

    def calculate_script_confidence(self, text: str) -> float:
        """
        Calculates what percentage of alphabetic characters belong to this language's unicode block.
        """
        if not text:
            return 0.0
        start, end = self.unicode_range
        script_chars = sum(1 for c in text if start <= ord(c) <= end)
        total_alpha = sum(1 for c in text if c.isalpha())
        if total_alpha == 0:
            return 0.0
        return script_chars / total_alpha


class LanguageRegistry:
    """
    Registry for all active and dynamically registered Indian language handlers.
    """
    _handlers: Dict[str, BaseLanguageHandler] = {}

    @classmethod
    def register(cls, handler: BaseLanguageHandler) -> None:
        cls._handlers[handler.language_code.lower()] = handler

    @classmethod
    def get(cls, lang_code: str) -> Optional[BaseLanguageHandler]:
        return cls._handlers.get(lang_code.lower())

    @classmethod
    def list_supported_languages(cls) -> List[str]:
        return list(cls._handlers.keys())

    @classmethod
    def detect_language(cls, text: str) -> BaseLanguageHandler:
        """
        Auto-detect the dominant language based on Unicode codepoint frequencies.
        Falls back to English if no Indic script threshold is met.
        """
        best_handler = cls._handlers.get("en")
        max_conf = 0.15

        for handler in cls._handlers.values():
            if handler.language_code == "en":
                continue
            conf = handler.calculate_script_confidence(text)
            if conf > max_conf:
                max_conf = conf
                best_handler = handler

        return best_handler if best_handler else cls._handlers.get("hi", list(cls._handlers.values())[0])
