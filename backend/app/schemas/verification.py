from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class VerificationTaskResponse(BaseModel):
    id: str
    land_record_id: str
    document_id: str
    task_code: str
    priority: str
    status: str
    assigned_verifier_id: Optional[str] = None
    assigned_verifier_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    claimed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    verifier_notes: Optional[str] = None
    resolution_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Summary data for list view
    owner_name: Optional[str] = None
    khasra_number: Optional[str] = None
    state_name: Optional[str] = None
    district_name: Optional[str] = None
    confidence_score: Optional[float] = None

    class Config:
        from_attributes = True


class VerificationTaskListResponse(BaseModel):
    items: List[VerificationTaskResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    counts_by_status: Optional[Dict[str, int]] = {}


class ClaimTaskRequest(BaseModel):
    notes: Optional[str] = Field(default=None, description="Initial triage or claim notes")


class SaveDraftRequest(BaseModel):
    field_updates: List[Dict[str, Any]] = Field(
        default=[],
        description="List of updated field dictionaries with {field_key, value, notes}"
    )
    verifier_notes: Optional[str] = Field(default=None, description="Interim notes")


class SubmitVerificationRequest(BaseModel):
    resolution_notes: Optional[str] = Field(default="Verified and certified with cadastral scan", description="Final verification notes")
    field_corrections: List[Dict[str, Any]] = Field(
        default=[],
        description="List of certified field updates: [{field_key: 'ownerName', edited_value: '...'}]"
    )


class RejectVerificationRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=5, description="Specific statutory or imaging reason for deed scan rejection")
    verifier_notes: Optional[str] = Field(default=None)
