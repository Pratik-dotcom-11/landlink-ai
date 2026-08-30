import uuid
from datetime import datetime, date, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Date, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class LandRecord(Base):
    __tablename__ = "land_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    record_unique_identifier = Column(String(100), unique=True, nullable=False, index=True)
    state_portal_reference_id = Column(String(100), nullable=True)  # ULPIN
    record_type = Column(String(100), nullable=False)  # 'Record of Rights (7/12)', 'Khasra Khatauni', etc.

    # Cadastral Identifiers
    khasra_number = Column(String(100), nullable=False, index=True)
    khata_number = Column(String(100), nullable=True)
    khatauni_number = Column(String(100), nullable=True)
    survey_number = Column(String(100), nullable=True)
    plot_number = Column(String(100), nullable=True)

    # Landholder Details
    primary_owner_name = Column(String(255), nullable=False, index=True)
    owner_name_transliterated = Column(String(255), nullable=True)
    father_guardian_name = Column(String(255), nullable=True)
    co_owners_count = Column(Integer, default=1)
    co_owners_details = Column(JSON, default=list)

    # Location & Jurisdiction
    state_name = Column(String(100), nullable=False, index=True)
    district_name = Column(String(100), nullable=False, index=True)
    tehsil_name = Column(String(100), nullable=False)
    revenue_circle_ri = Column(String(100), nullable=True)
    village_name = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=True)

    # Area Metrics
    total_area_hectares = Column(Float, nullable=False, default=0.0)
    total_area_acres = Column(Float, nullable=False, default=0.0)
    original_area_value = Column(Float, nullable=False, default=0.0)
    original_area_unit = Column(String(50), nullable=False, default="Acres")

    # Classification & Revenue
    land_use_classification = Column(String(100), nullable=False, default="Agricultural")
    soil_classification = Column(String(100), nullable=True)
    irrigation_source = Column(String(100), nullable=True)
    land_revenue_tax_inr = Column(Float, default=0.0)

    # Legal & Encumbrance
    tenure_type = Column(String(100), default="Bhumiswami (Freehold)")
    is_disputed = Column(Boolean, default=False)
    dispute_details = Column(Text, nullable=True)
    mutation_number = Column(String(100), nullable=True)
    mutation_date = Column(Date, nullable=True)
    registration_deed_number = Column(String(100), nullable=True)
    registration_date = Column(Date, nullable=True)

    # Spatial GeoJSON
    spatial_geojson = Column(JSON, default=dict)

    # Confidence & Approval Workflow
    overall_confidence_score = Column(Float, nullable=False, default=0.0, index=True)
    is_auto_approved = Column(Boolean, default=False)
    verification_status = Column(String(50), default="PENDING_VERIFICATION", index=True)

    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    record_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="land_record")
    fields = relationship("LandRecordField", back_populates="land_record", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="land_record", cascade="all, delete-orphan")
    verification_task = relationship("VerificationTask", back_populates="land_record", uselist=False, cascade="all, delete-orphan")
    approver = relationship("User", foreign_keys=[approved_by])


class LandRecordField(Base):
    __tablename__ = "land_record_fields"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    land_record_id = Column(String(36), ForeignKey("land_records.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_id = Column(String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True)

    field_key = Column(String(100), nullable=False, index=True)
    field_label = Column(String(150), nullable=False)
    field_category = Column(String(50), nullable=False, default="GENERAL")

    raw_ocr_value = Column(Text, nullable=False)
    standardized_value = Column(Text, nullable=False)
    data_type = Column(String(30), default="STRING")

    confidence_score = Column(Float, nullable=False, default=0.0)
    confidence_tier = Column(String(20), nullable=False, default="MEDIUM", index=True)  # HIGH, MEDIUM, LOW

    bounding_box_x = Column(Float, nullable=True)
    bounding_box_y = Column(Float, nullable=True)
    bounding_box_width = Column(Float, nullable=True)
    bounding_box_height = Column(Float, nullable=True)

    is_manually_edited = Column(Boolean, default=False, index=True)
    original_ai_value = Column(Text, nullable=True)
    edited_value = Column(Text, nullable=True)
    edited_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    edited_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    land_record = relationship("LandRecord", back_populates="fields")
    editor = relationship("User", foreign_keys=[edited_by])
