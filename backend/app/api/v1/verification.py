from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.verification import VerificationTask
from app.models.land_record import LandRecord, LandRecordField
from app.models.document import Document
from app.models.user import User
from app.schemas.verification import (
    VerificationTaskResponse, VerificationTaskListResponse,
    ClaimTaskRequest, SaveDraftRequest, SubmitVerificationRequest, RejectVerificationRequest
)
from app.schemas.common import StandardResponse
from app.core.rbac import get_current_user, require_permissions, PermissionEnum
from app.core.exceptions import EntityNotFoundException, ValidationFailedException
from app.core.audit import log_audit_event
from app.core.validation_engine import run_cadastral_validations
from app.core.logging import logger

router = APIRouter(prefix="/verification", tags=["Human-in-the-Loop Verification"])


@router.get("/tasks", response_model=VerificationTaskListResponse, summary="List Verification Queue Tasks")
def list_verification_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves human-in-the-loop verification tasks with queue priority and assignment filtering.
    """
    query = db.query(VerificationTask)

    if status:
        query = query.filter(VerificationTask.status == status)
    if priority:
        query = query.filter(VerificationTask.priority == priority)
    if assigned_to_me:
        query = query.filter(VerificationTask.assigned_verifier_id == current_user.id)

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    tasks = query.order_by(
        desc(VerificationTask.priority == "URGENT"),
        desc(VerificationTask.priority == "HIGH"),
        desc(VerificationTask.created_at)
    ).offset((page - 1) * limit).limit(limit).all()

    # Status counts summary
    all_tasks = db.query(VerificationTask.status).all()
    counts: Dict[str, int] = {}
    for (s,) in all_tasks:
        counts[s] = counts.get(s, 0) + 1

    items = []
    for t in tasks:
        item = VerificationTaskResponse.model_validate(t)
        if t.assigned_verifier:
            item.assigned_verifier_name = t.assigned_verifier.full_name
        if t.land_record:
            item.owner_name = t.land_record.primary_owner_name
            item.khasra_number = t.land_record.khasra_number
            item.state_name = t.land_record.state_name
            item.district_name = t.land_record.district_name
            item.confidence_score = t.land_record.overall_confidence_score
        items.append(item)

    return VerificationTaskListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        counts_by_status=counts
    )


@router.get("/tasks/{task_id}", response_model=VerificationTaskResponse, summary="Get Verification Task Workspace Data")
def get_verification_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns single verification task metadata and current assignment state.
    """
    task = db.query(VerificationTask).filter(VerificationTask.id == task_id).first()
    if not task:
        raise EntityNotFoundException("VerificationTask", task_id)

    res = VerificationTaskResponse.model_validate(task)
    if task.assigned_verifier:
        res.assigned_verifier_name = task.assigned_verifier.full_name
    if task.land_record:
        res.owner_name = task.land_record.primary_owner_name
        res.khasra_number = task.land_record.khasra_number
        res.state_name = task.land_record.state_name
        res.district_name = task.land_record.district_name
        res.confidence_score = task.land_record.overall_confidence_score
    return res


@router.post("/tasks/{task_id}/claim", response_model=VerificationTaskResponse, summary="Claim Task for Verification")
def claim_verification_task(
    task_id: str,
    claim_in: Optional[ClaimTaskRequest] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assigns a queued verification task to the current authenticated revenue verifier / patwari.
    """
    task = db.query(VerificationTask).filter(VerificationTask.id == task_id).first()
    if not task:
        raise EntityNotFoundException("VerificationTask", task_id)

    task.assigned_verifier_id = current_user.id
    task.assigned_at = datetime.now(timezone.utc)
    task.claimed_at = datetime.now(timezone.utc)
    task.status = "IN_PROGRESS"
    if claim_in and claim_in.notes:
        task.verifier_notes = claim_in.notes

    log_audit_event(
        db=db,
        event_type="TASK_CLAIMED",
        entity_name="verification_tasks",
        entity_id=task.id,
        user=current_user,
        action_summary=f"Verifier {current_user.email} claimed task {task.task_code}",
        request=request
    )
    db.commit()
    db.refresh(task)

    res = VerificationTaskResponse.model_validate(task)
    res.assigned_verifier_name = current_user.full_name
    return res


@router.post("/records/{record_id}/save-draft", response_model=StandardResponse, summary="Save Interim Verification Draft")
def save_verification_draft(
    record_id: str,
    draft_in: SaveDraftRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Persists interim edits and notes without changing the overall record approval status.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    for field_edit in draft_in.field_updates:
        f_key = field_edit.get("field_key")
        val = field_edit.get("value")
        if not f_key or val is None:
            continue

        field = db.query(LandRecordField).filter(
            LandRecordField.land_record_id == record_id,
            LandRecordField.field_key == f_key
        ).first()

        if field:
            if not field.original_ai_value:
                field.original_ai_value = field.raw_ocr_value
            field.is_manually_edited = True
            field.edited_value = str(val)
            field.edited_by = current_user.id
            field.edited_at = datetime.now(timezone.utc)
            if field_edit.get("notes"):
                field.verification_notes = field_edit.get("notes")

    if draft_in.verifier_notes and record.verification_task:
        record.verification_task.verifier_notes = draft_in.verifier_notes

    db.commit()
    return StandardResponse(success=True, message="Draft changes saved successfully.")


@router.post("/records/{record_id}/submit", response_model=StandardResponse, summary="Submit Verification & Approve Record")
def submit_record_verification(
    record_id: str,
    submit_in: SubmitVerificationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Certifies all fields, finalizes human verification, updates land record status to VERIFIED_APPROVED,
    and records immutable sign-off in the audit trail.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    # Apply any final field corrections
    for f_corr in submit_in.field_corrections:
        f_key = f_corr.get("field_key")
        val = f_corr.get("edited_value")
        if f_key and val is not None:
            field = db.query(LandRecordField).filter(
                LandRecordField.land_record_id == record_id,
                LandRecordField.field_key == f_key
            ).first()
            if field:
                if not field.original_ai_value:
                    field.original_ai_value = field.raw_ocr_value
                field.is_manually_edited = True
                field.edited_value = str(val)
                field.standardized_value = str(val)
                field.confidence_score = 1.0
                field.confidence_tier = "HIGH"
                field.edited_by = current_user.id
                field.edited_at = datetime.now(timezone.utc)

    # Update record state
    record.verification_status = "VERIFIED_APPROVED"
    record.overall_confidence_score = 1.0
    record.approved_by = current_user.id
    record.approved_at = datetime.now(timezone.utc)

    # Update document status
    if record.document:
        record.document.status = "VERIFIED_APPROVED"

    # Complete verification task
    if record.verification_task:
        task = record.verification_task
        task.status = "RESOLVED_APPROVED"
        task.completed_at = datetime.now(timezone.utc)
        task.verifier_notes = submit_in.resolution_notes
        task.resolution_type = "CORRECTED_AND_APPROVED"

    # Re-run cadastral validations
    run_cadastral_validations(db, record)

    log_audit_event(
        db=db,
        event_type="RECORD_VERIFIED_AND_APPROVED",
        entity_name="land_records",
        entity_id=record.id,
        user=current_user,
        action_summary=f"Verifier {current_user.email} approved and certified record {record.record_unique_identifier}",
        new_state={"status": "VERIFIED_APPROVED", "approved_by": current_user.email},
        request=request
    )
    db.commit()

    return StandardResponse(
        success=True,
        message=f"Land Record {record.record_unique_identifier} verified and certified successfully.",
        data={"record_id": record.id, "status": "VERIFIED_APPROVED"}
    )


@router.post("/records/{record_id}/reject", response_model=StandardResponse, summary="Reject Deed Scan")
def reject_record_verification(
    record_id: str,
    reject_in: RejectVerificationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rejects unreadable, corrupted, or non-compliant deed scans with statutory justification.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    record.verification_status = "REJECTED"
    if record.document:
        record.document.status = "REJECTED"

    if record.verification_task:
        task = record.verification_task
        task.status = "RESOLVED_REJECTED"
        task.completed_at = datetime.now(timezone.utc)
        task.rejection_reason = reject_in.rejection_reason
        task.verifier_notes = reject_in.verifier_notes
        task.resolution_type = "REJECTED_UNREADABLE"

    log_audit_event(
        db=db,
        event_type="RECORD_REJECTED",
        entity_name="land_records",
        entity_id=record.id,
        user=current_user,
        action_summary=f"Verifier {current_user.email} rejected record {record.record_unique_identifier}: {reject_in.rejection_reason}",
        new_state={"status": "REJECTED", "reason": reject_in.rejection_reason},
        request=request
    )
    db.commit()

    return StandardResponse(
        success=True,
        message=f"Land record {record.record_unique_identifier} rejected.",
        data={"record_id": record.id, "status": "REJECTED"}
    )
