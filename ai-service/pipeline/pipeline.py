"""
End-to-End AI/OCR Document Processing Pipeline for Land Record Digitization.
Orchestrates Ingestion -> Preprocessing -> OCR -> Normalization -> Field Extraction -> Confidence Scoring -> Validation JSON.
"""
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from schemas.models import (
    ValidationReadyJSON,
    ProcessingMetrics,
    ConfidenceTier,
)
from config import PipelineConfig, default_config
from processors.document_processor import DocumentProcessor, IngestedDocument
from preprocessing.image_preprocessor import ImagePreprocessor, PreprocessingResult
from ocr.ocr_engine import OCREngine, OCRPageResult
from normalization.text_normalizer import TextNormalizer
from extractors.field_extractor import FieldExtractor
from scoring.confidence_scorer import ConfidenceScorer
from languages.base import LanguageRegistry


class LandRecordPipeline:
    """
    Modular Land Record Processing Pipeline.
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or default_config
        self.doc_processor = DocumentProcessor()
        self.image_preprocessor = ImagePreprocessor(
            target_dpi=self.config.TARGET_DPI,
            auto_deskew=self.config.AUTO_DESKEW
        )
        self.ocr_engine = OCREngine(engine_name=self.config.OCR_ENGINE_NAME)
        self.text_normalizer = TextNormalizer()
        self.field_extractor = FieldExtractor(normalizer=self.text_normalizer)
        self.confidence_scorer = ConfidenceScorer(config=self.config)

    def process_document(
        self,
        file_input: Any,
        filename: str = "document.png",
        preferred_language: Optional[str] = None
    ) -> ValidationReadyJSON:
        """
        Executes the full 7-stage digitization pipeline on a document.
        
        Args:
            file_input: File path (str), raw binary bytes, or bytearray.
            filename: Name of the uploaded file.
            preferred_language: Optional ISO code ('en', 'hi', 'bn') to override auto-detection.

        Returns:
            ValidationReadyJSON: Validation-ready structured payload matching PostgreSQL schema.
        """
        start_time = time.perf_counter()
        doc_id = str(uuid.uuid4())

        # =========================================================================
        # STAGE 1: Document Ingestion & Page Splitting
        # =========================================================================
        t0 = time.perf_counter()
        ingested_doc: IngestedDocument = self.doc_processor.ingest_file(
            file_path_or_bytes=file_input,
            original_filename=filename
        )
        t_ingest = time.perf_counter() - t0

        # =========================================================================
        # STAGE 2: Image Preprocessing (Per Page)
        # =========================================================================
        t0 = time.perf_counter()
        preprocessed_pages: List[PreprocessingResult] = []
        for page_data in ingested_doc.pages:
            prep_res = self.image_preprocessor.preprocess_page(
                image_bytes=page_data.raw_bytes,
                width=page_data.width_px,
                height=page_data.height_px
            )
            preprocessed_pages.append(prep_res)
        t_prep = time.perf_counter() - t0

        # =========================================================================
        # STAGE 3: OCR & Layout Analysis
        # =========================================================================
        t0 = time.perf_counter()
        ocr_results: List[OCRPageResult] = []
        for idx, page_data in enumerate(ingested_doc.pages):
            ocr_res = self.ocr_engine.process_page(
                page_bytes=page_data.raw_bytes,
                page_number=page_data.page_number,
                preferred_language=preferred_language,
                embedded_text=page_data.embedded_text
            )
            ocr_results.append(ocr_res)
        t_ocr = time.perf_counter() - t0

        # Overall OCR confidence average
        ocr_avg_conf = (
            sum(p.average_confidence for p in ocr_results) / max(1, len(ocr_results))
            if ocr_results else 0.50
        )
        detected_lang = ocr_results[0].detected_language if ocr_results else (preferred_language or "hi")
        script_type = ocr_results[0].script_type if ocr_results else "Devanagari"

        # =========================================================================
        # STAGE 4 & 5: Text Normalization & Land-Record Field Extraction
        # =========================================================================
        t0 = time.perf_counter()
        extracted_fields, area_details, mutation_details, registration_details = self.field_extractor.extract_fields(
            ocr_results=ocr_results,
            language_code=preferred_language or detected_lang
        )
        t_extract = time.perf_counter() - t0

        # =========================================================================
        # STAGE 6: Confidence Scoring & Verification Triage
        # =========================================================================
        t0 = time.perf_counter()
        overall_conf, conf_tier, req_verif, verif_reasons, auto_app, val_alerts = self.confidence_scorer.evaluate_record(
            fields=extracted_fields,
            area_details=area_details,
            ocr_average_confidence=ocr_avg_conf
        )
        t_val = time.perf_counter() - t0

        total_time_ms = (time.perf_counter() - start_time) * 1000

        # Aggregate raw text
        full_text = "\n\n".join(p.full_text for p in ocr_results)

        metrics = ProcessingMetrics(
            total_processing_time_ms=total_time_ms,
            preprocessing_time_ms=t_prep * 1000,
            ocr_time_ms=t_ocr * 1000,
            extraction_time_ms=t_extract * 1000,
            validation_time_ms=t_val * 1000,
            pages_processed=len(ingested_doc.pages),
            total_characters_extracted=len(full_text),
            words_extracted=len(full_text.split()),
            engine_name=self.config.OCR_ENGINE_NAME
        )

        # =========================================================================
        # STAGE 7: Validation-Ready JSON Generation
        # =========================================================================
        return ValidationReadyJSON(
            document_id=doc_id,
            filename=ingested_doc.filename,
            file_type=ingested_doc.file_type,
            detected_language=detected_lang,
            script_type=script_type,
            processed_at=datetime.utcnow().isoformat() + "Z",
            fields=extracted_fields,
            area_details=area_details,
            mutation_details=mutation_details,
            registration_details=registration_details,
            overall_confidence=overall_conf,
            overall_confidence_tier=conf_tier,
            requires_human_verification=req_verif,
            verification_reasons=verif_reasons,
            auto_approval_eligible=auto_app,
            validation_alerts=val_alerts,
            metrics=metrics,
            raw_extracted_text=full_text
        )
