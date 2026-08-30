"""
Configuration constants and threshold parameters for the AI/OCR Land Record Pipeline.
"""
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class PipelineConfig:
    # Confidence thresholds
    HIGH_CONFIDENCE_THRESHOLD: float = 0.85
    MEDIUM_CONFIDENCE_THRESHOLD: float = 0.60
    LOW_CONFIDENCE_THRESHOLD: float = 0.40

    # Auto-approval criteria
    AUTO_APPROVE_MIN_CONFIDENCE: float = 0.85
    AUTO_APPROVE_ALLOW_WARNINGS: bool = True

    # Processing limits
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    SUPPORTED_EXTENSIONS: tuple = (".pdf", ".jpg", ".jpeg", ".png")
    SUPPORTED_LANGUAGES: tuple = ("en", "hi", "bn")
    DEFAULT_LANGUAGE: str = "hi"

    # Image preprocessing settings
    TARGET_DPI: int = 300
    AUTO_DESKEW: bool = True
    MAX_DESKEW_ANGLE: float = 45.0
    APPLY_ADAPTIVE_THRESHOLD: bool = True

    # OCR settings
    OCR_ENGINE_NAME: str = "DoLR-Multimodal-IndicOCR-v1.0"
    FALLBACK_TO_RULE_EXTRACTION: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "high_confidence_threshold": self.HIGH_CONFIDENCE_THRESHOLD,
            "medium_confidence_threshold": self.MEDIUM_CONFIDENCE_THRESHOLD,
            "low_confidence_threshold": self.LOW_CONFIDENCE_THRESHOLD,
            "supported_extensions": list(self.SUPPORTED_EXTENSIONS),
            "supported_languages": list(self.SUPPORTED_LANGUAGES),
            "target_dpi": self.TARGET_DPI,
            "ocr_engine_name": self.OCR_ENGINE_NAME,
        }


# Default global instance
default_config = PipelineConfig()
