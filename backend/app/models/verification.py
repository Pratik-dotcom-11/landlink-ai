import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class VerificationTask(Base):
    __tablename__ = "verification_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    land_record_id = Column(String(36), ForeignKey("land_records.id", ondelete="CASCADE"), unique=True, nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)

    task_code = Column(String(100), unique=True, nullable=False, index=True)
    priority = Column(String(20), nullable=False, default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, URGENT, EXPEDITED
    status = Column(String(50), nullable=False, default="UNASSIGNED", index=True)  # UNASSIGNED, ASSIGNED, IN_PROGRESS, RESOLVED_APPROVED, RESOLVED_REJECTED

    assigned_verifier_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_at = Column(DateTime, nullable=True)
    claimed_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    rejection_reason = Column(Text, nullable=True)
    verifier_notes = Column(Text, nullable=True)
    resolution_type = Column(String(50), nullable=True)  # APPROVED_AS_IS, CORRECTED_AND_APPROVED, REJECTED_BLURRY

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    land_record = relationship("LandRecord", back_populates="verification_task")
    document = relationship("Document", back_populates="verification_task")
    assigned_verifier = relationship("User", foreign_keys=[assigned_verifier_id])
