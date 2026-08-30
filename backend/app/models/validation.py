import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    land_record_id = Column(String(36), ForeignKey("land_records.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("processing_jobs.id", ondelete="SET NULL"), nullable=True)

    rule_code = Column(String(50), nullable=False, index=True)  # VAL-AREA-SUM, VAL-KHASRA-FMT, etc.
    rule_category = Column(String(50), nullable=False)  # MATHEMATICAL, SYNTACTIC, LEXICAL, CROSS_DOCUMENT
    rule_name = Column(String(150), nullable=False)
    rule_description = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="PASS", index=True)  # PASS, WARNING, FAIL, SKIPPED
    severity = Column(String(20), nullable=False, default="MEDIUM")  # INFO, LOW, MEDIUM, HIGH, CRITICAL

    expected_value = Column(Text, nullable=True)
    actual_value = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    resolution_suggestion = Column(Text, nullable=True)
    is_blocking = Column(Boolean, nullable=False, default=False)

    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    land_record = relationship("LandRecord", back_populates="validation_results")
