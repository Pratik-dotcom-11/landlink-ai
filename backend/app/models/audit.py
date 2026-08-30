import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(50), nullable=False, index=True)  # USER_LOGIN, DOCUMENT_UPLOAD, FIELD_MANUAL_EDIT, RECORD_APPROVED, RECORD_REJECTED, etc.
    entity_name = Column(String(100), nullable=False, index=True)  # 'documents', 'land_records', 'land_record_fields', etc.
    entity_id = Column(String(36), nullable=False, index=True)

    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_role = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    action_summary = Column(Text, nullable=False)
    old_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    diff_payload = Column(JSON, nullable=True)

    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User", foreign_keys=[user_id])
