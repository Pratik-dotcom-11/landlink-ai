import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_unique_code = Column(String(100), nullable=False, unique=True, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, png, jpg, svg, tiff
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    file_hash_sha256 = Column(String(64), nullable=False, index=True)

    # Geographic Jurisdiction
    state_code = Column(String(10), nullable=False)
    state_name = Column(String(100), nullable=False, index=True)
    district_name = Column(String(100), nullable=False, index=True)
    tehsil_name = Column(String(100), nullable=True)
    village_name = Column(String(100), nullable=True)

    # Language & Script
    primary_language = Column(String(50), nullable=False, default="Hindi", index=True)
    script_type = Column(String(50), nullable=False, default="Devanagari")
    total_pages = Column(Integer, nullable=False, default=1)

    # Operational Lifecycle
    status = Column(String(50), nullable=False, default="UPLOADED", index=True)
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    raw_document_metadata = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    uploader = relationship("User", back_populates="documents", foreign_keys=[uploaded_by])
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")
    ocr_results = relationship("OCRResult", back_populates="document", cascade="all, delete-orphan")
    land_record = relationship("LandRecord", back_populates="document", uselist=False, cascade="all, delete-orphan")
    verification_task = relationship("VerificationTask", back_populates="document", uselist=False, cascade="all, delete-orphan")


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    page_storage_path = Column(Text, nullable=False)
    width_pixels = Column(Integer, nullable=True)
    height_pixels = Column(Integer, nullable=True)
    resolution_dpi = Column(Integer, default=300)
    rotation_degrees = Column(Integer, default=0)
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="pages")
    ocr_results = relationship("OCRResult", back_populates="page")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # MULTIMODAL_OCR, CADASTRAL_RULE_VALIDATION
    engine_name = Column(String(100), nullable=False)
    engine_version = Column(String(50), default="v1.0.0")
    status = Column(String(50), nullable=False, default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED
    priority = Column(Integer, default=5)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    execution_time_ms = Column(BigInteger, nullable=True)

    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    job_payload = Column(JSON, default=dict)
    job_metrics = Column(JSON, default=dict)

    triggered_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="jobs")


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_id = Column(String(36), ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=True, index=True)
    job_id = Column(String(36), ForeignKey("processing_jobs.id", ondelete="SET NULL"), nullable=True)

    engine_name = Column(String(100), nullable=False)
    raw_extracted_text = Column(Text, nullable=False)
    structured_json = Column(JSON, default=dict)

    average_confidence = Column(Float, nullable=False, default=0.0)
    character_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    tables_detected_count = Column(Integer, default=0)
    stamps_detected_count = Column(Integer, default=0)
    signatures_detected_count = Column(Integer, default=0)

    processing_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="ocr_results")
    page = relationship("DocumentPage", back_populates="ocr_results")
