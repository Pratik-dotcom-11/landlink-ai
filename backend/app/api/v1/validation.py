from typing import List
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.land_record import LandRecord
from app.models.validation import ValidationResult
from app.models.user import User
from app.schemas.validation import (
    ValidationResultResponse, ValidationSummaryResponse, RuleDefinition
)
from app.schemas.common import StandardResponse
from app.core.rbac import get_current_user
from app.core.exceptions import EntityNotFoundException
from app.core.validation_engine import (
    run_cadastral_validations, VALIDATION_RULES_CATALOG
)
from app.core.audit import log_audit_event

router = APIRouter(prefix="/validation", tags=["Cadastral Rule Validation Engine"])


@router.get("/rules", response_model=List[RuleDefinition], summary="List Active Cadastral Validation Rules")
def get_validation_rules(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the comprehensive catalog of cadastral rule checks enforced by the engine.
    """
    return VALIDATION_RULES_CATALOG


@router.get("/records/{record_id}/results", response_model=ValidationSummaryResponse, summary="Get Record Validation Report")
def get_record_validation_results(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns granular validation rule outcomes, severity indicators, and resolution advice for a record.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    results = db.query(ValidationResult).filter(ValidationResult.land_record_id == record_id).all()
    if not results:
        # Run validations dynamically if not yet executed
        results = run_cadastral_validations(db, record)
        db.commit()

    passed = sum(1 for r in results if r.status == "PASS")
    warnings = sum(1 for r in results if r.status == "WARNING")
    failed = sum(1 for r in results if r.status == "FAIL")
    has_blocking = any(r.is_blocking and r.status == "FAIL" for r in results)

    return ValidationSummaryResponse(
        record_id=record_id,
        total_rules_evaluated=len(results),
        passed_count=passed,
        warning_count=warnings,
        failed_count=failed,
        is_blocking_error_present=has_blocking,
        results=[ValidationResultResponse.model_validate(r) for r in results]
    )


@router.post("/records/{record_id}/run", response_model=ValidationSummaryResponse, summary="Re-run Cadastral Validation Engine")
def execute_validation_rules(
    record_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes a fresh evaluation of all cadastral cross-validation rules against current record state.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    results = run_cadastral_validations(db, record)

    log_audit_event(
        db=db,
        event_type="VALIDATION_RE_EVALUATED",
        entity_name="land_records",
        entity_id=record.id,
        user=current_user,
        action_summary=f"User {current_user.email} re-executed validation engine on record {record.record_unique_identifier}",
        request=request
    )
    db.commit()

    passed = sum(1 for r in results if r.status == "PASS")
    warnings = sum(1 for r in results if r.status == "WARNING")
    failed = sum(1 for r in results if r.status == "FAIL")
    has_blocking = any(r.is_blocking and r.status == "FAIL" for r in results)

    return ValidationSummaryResponse(
        record_id=record_id,
        total_rules_evaluated=len(results),
        passed_count=passed,
        warning_count=warnings,
        failed_count=failed,
        is_blocking_error_present=has_blocking,
        results=[ValidationResultResponse.model_validate(r) for r in results]
    )
