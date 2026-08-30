from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    id: str
    event_type: str
    entity_name: str
    entity_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    action_summary: str
    old_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    diff_payload: Optional[Dict[str, Any]] = None
    recorded_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class AuditLogFilterParams(BaseModel):
    event_type: Optional[str] = None
    entity_name: Optional[str] = None
    entity_id: Optional[str] = None
    user_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    page: int = 1
    limit: int = 20
