from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.core.rbac import get_current_user, require_roles, RoleEnum
from app.core.exceptions import EntityNotFoundException

router = APIRouter(prefix="/audit", tags=["Compliance & Audit Trail"])


@router.get("/logs", response_model=AuditLogListResponse, summary="Query Immutable Audit Ledger")
def list_audit_logs(
    event_type: Optional[str] = None,
    entity_name: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns immutable audit logs tracking logins, document uploads, manual field edits, and approval actions.
    """
    query = db.query(AuditLog)

    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    logs = query.order_by(desc(AuditLog.recorded_at)).offset((page - 1) * limit).limit(limit).all()

    items = []
    for log in logs:
        item = AuditLogResponse.model_validate(log)
        if log.user:
            item.user_email = log.user.email
        items.append(item)

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/logs/{log_id}", response_model=AuditLogResponse, summary="Get Single Audit Log Entry")
def get_audit_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full audit log entry including previous state, updated state, and differential payload.
    """
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise EntityNotFoundException("AuditLog", log_id)

    item = AuditLogResponse.model_validate(log)
    if log.user:
        item.user_email = log.user.email
    return item
