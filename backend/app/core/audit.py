import uuid
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import Request

from app.models.audit import AuditLog
from app.models.user import User
from app.core.logging import logger


def log_audit_event(
    db: Session,
    event_type: str,
    entity_name: str,
    entity_id: str,
    action_summary: str,
    user: Optional[User] = None,
    old_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None,
    diff_payload: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    """
    Creates an immutable audit log entry in the database for tracking state transitions.
    """
    try:
        user_id = user.id if user else None
        user_role = user.role.code if user and user.role else "ANONYMOUS"

        client_ip = ip_address
        client_ua = user_agent

        if request:
            client_ip = client_ip or (request.client.host if request.client else "127.0.0.1")
            client_ua = client_ua or request.headers.get("user-agent", "Unknown")

        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            event_type=event_type,
            entity_name=entity_name,
            entity_id=str(entity_id),
            user_id=user_id,
            user_role=user_role,
            ip_address=client_ip,
            user_agent=client_ua,
            action_summary=action_summary,
            old_state=old_state,
            new_state=new_state,
            diff_payload=diff_payload,
            recorded_at=datetime.now(timezone.utc)
        )
        db.add(audit_entry)
        db.flush()
        return audit_entry
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")
        # Audit failure shouldn't crash the primary transaction unless critical
        return None
