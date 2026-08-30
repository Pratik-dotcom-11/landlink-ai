import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models.land_record import LandRecord, LandRecordField
from app.models.validation import ValidationResult
from app.models.user import User
from app.schemas.land_record import (
    LandRecordResponse, LandRecordDetailResponse, LandRecordListResponse,
    LandRecordUpdate, LandRecordFieldSchema, LandRecordFieldUpdate
)
from app.schemas.common import StandardResponse
from app.core.rbac import get_current_user
from app.core.exceptions import EntityNotFoundException, ValidationFailedException
from app.core.audit import log_audit_event
from app.core.validation_engine import run_cadastral_validations
from app.core.logging import logger

router = APIRouter(prefix="/records", tags=["Cadastral Land Records"])


@router.get("", response_model=LandRecordListResponse, summary="List Land Records")
def list_land_records(
    state_name: Optional[str] = None,
    district_name: Optional[str] = None,
    khasra_number: Optional[str] = None,
    primary_owner_name: Optional[str] = None,
    verification_status: Optional[str] = None,
    min_confidence: Optional[float] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves digitized land records with comprehensive filters.
    """
    query = db.query(LandRecord)

    if state_name:
        query = query.filter(LandRecord.state_name.ilike(f"%{state_name}%"))
    if district_name:
        query = query.filter(LandRecord.district_name.ilike(f"%{district_name}%"))
    if khasra_number:
        query = query.filter(LandRecord.khasra_number.ilike(f"%{khasra_number}%"))
    if primary_owner_name:
        query = query.filter(
            or_(
                LandRecord.primary_owner_name.ilike(f"%{primary_owner_name}%"),
                LandRecord.owner_name_transliterated.ilike(f"%{primary_owner_name}%")
            )
        )
    if verification_status:
        query = query.filter(LandRecord.verification_status == verification_status)
    if min_confidence is not None:
        query = query.filter(LandRecord.overall_confidence_score >= min_confidence)
    if search:
        query = query.filter(
            or_(
                LandRecord.primary_owner_name.ilike(f"%{search}%"),
                LandRecord.owner_name_transliterated.ilike(f"%{search}%"),
                LandRecord.khasra_number.ilike(f"%{search}%"),
                LandRecord.village_name.ilike(f"%{search}%"),
                LandRecord.record_unique_identifier.ilike(f"%{search}%"),
                LandRecord.state_portal_reference_id.ilike(f"%{search}%")
            )
        )

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    records = query.order_by(desc(LandRecord.created_at)).offset((page - 1) * limit).limit(limit).all()

    return LandRecordListResponse(
        items=[LandRecordResponse.model_validate(r) for r in records],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{record_id}", response_model=LandRecordDetailResponse, summary="Get Land Record Detail Dossier")
def get_land_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns complete cadastral record details including spatial GeoJSON polygon,
    bounding box coordinates for all extracted fields, and active validation status.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    # Calculate validation summary
    val_results = db.query(ValidationResult).filter(ValidationResult.land_record_id == record_id).all()
    passed = sum(1 for v in val_results if v.status == "PASS")
    warnings = sum(1 for v in val_results if v.status == "WARNING")
    failed = sum(1 for v in val_results if v.status == "FAIL")
    has_blocking = any(v.is_blocking and v.status == "FAIL" for v in val_results)

    val_summary = {
        "total_rules_evaluated": len(val_results),
        "passed": passed,
        "warnings": warnings,
        "failed": failed,
        "has_blocking": has_blocking
    }

    fields = db.query(LandRecordField).filter(LandRecordField.land_record_id == record_id).all()

    detail = LandRecordDetailResponse.model_validate(record)
    detail.fields = [LandRecordFieldSchema.model_validate(f) for f in fields]
    detail.validation_results_summary = val_summary
    return detail


@router.put("/{record_id}", response_model=LandRecordResponse, summary="Update Land Record Attributes")
def update_land_record(
    record_id: str,
    update_in: LandRecordUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates core land record parameters (owner name, khasra number, area metrics).
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    old_state = {
        "primary_owner_name": record.primary_owner_name,
        "khasra_number": record.khasra_number,
        "total_area_hectares": record.total_area_hectares
    }

    update_data = update_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(record, field, val)

    # Re-run validation rules on modified record
    run_cadastral_validations(db, record)

    log_audit_event(
        db=db,
        event_type="RECORD_UPDATED",
        entity_name="land_records",
        entity_id=record.id,
        user=current_user,
        action_summary=f"User {current_user.email} updated record {record.record_unique_identifier}",
        old_state=old_state,
        new_state=update_data,
        request=request
    )
    db.commit()
    db.refresh(record)

    return LandRecordResponse.model_validate(record)


@router.get("/{record_id}/fields", response_model=List[LandRecordFieldSchema], summary="List Record Fields & Bounding Boxes")
def get_record_fields(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns granular OCR extracted fields with confidence tiers and bounding boxes.
    """
    fields = db.query(LandRecordField).filter(LandRecordField.land_record_id == record_id).all()
    return [LandRecordFieldSchema.model_validate(f) for f in fields]


@router.put("/{record_id}/fields/{field_id}", response_model=LandRecordFieldSchema, summary="Manual Field Correction")
def update_record_field(
    record_id: str,
    field_id: str,
    field_update: LandRecordFieldUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Performs human-in-the-loop manual correction of a specific OCR field with audit trail.
    """
    field = db.query(LandRecordField).filter(
        LandRecordField.id == field_id,
        LandRecordField.land_record_id == record_id
    ).first()
    if not field:
        raise EntityNotFoundException("LandRecordField", field_id)

    old_val = field.edited_value or field.raw_ocr_value
    if not field.original_ai_value:
        field.original_ai_value = field.raw_ocr_value

    field.is_manually_edited = True
    field.edited_value = field_update.edited_value.strip()
    field.standardized_value = field_update.edited_value.strip()
    field.edited_by = current_user.id
    field.edited_at = datetime.now(timezone.utc)
    field.verification_notes = field_update.verification_notes
    field.confidence_score = 1.0  # Human verified
    field.confidence_tier = "HIGH"

    # Also update master record attribute if matching
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if record:
        if field.field_key in ["ownerName", "primary_owner_name"]:
            record.primary_owner_name = field.edited_value
        elif field.field_key in ["khasraNumber", "khasra_number"]:
            record.khasra_number = field.edited_value
        elif field.field_key in ["plotArea", "total_area_hectares"]:
            try:
                record.total_area_hectares = float(field.edited_value.replace("Ha", "").strip())
            except Exception:
                pass
        run_cadastral_validations(db, record)

    log_audit_event(
        db=db,
        event_type="FIELD_MANUAL_EDIT",
        entity_name="land_record_fields",
        entity_id=field.id,
        user=current_user,
        action_summary=f"User {current_user.email} corrected field '{field.field_label}' from '{old_val}' to '{field.edited_value}'",
        old_state={"value": old_val},
        new_state={"value": field.edited_value, "notes": field.verification_notes},
        request=request
    )
    db.commit()
    db.refresh(field)

    return LandRecordFieldSchema.model_validate(field)


@router.get("/{record_id}/export", summary="Export Canonical Land Record JSON / GeoJSON")
def export_land_record(
    record_id: str,
    format: str = Query("json", regex="^(json|geojson)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports a certified cadastral record in standardized JSON or GeoJSON schema for state land bank integration.
    """
    record = db.query(LandRecord).filter(LandRecord.id == record_id).first()
    if not record:
        raise EntityNotFoundException("LandRecord", record_id)

    fields = db.query(LandRecordField).filter(LandRecordField.land_record_id == record_id).all()
    validations = db.query(ValidationResult).filter(ValidationResult.land_record_id == record_id).all()

    if format == "geojson":
        return {
            "type": "Feature",
            "id": record.record_unique_identifier,
            "properties": {
                "record_id": record.id,
                "khasra_number": record.khasra_number,
                "owner_name": record.primary_owner_name,
                "area_hectares": record.total_area_hectares,
                "state": record.state_name,
                "district": record.district_name,
                "tehsil": record.tehsil_name,
                "village": record.village_name,
                "verification_status": record.verification_status,
                "confidence_score": record.overall_confidence_score,
                "certified_at": record.approved_at.isoformat() if record.approved_at else None
            },
            "geometry": record.spatial_geojson.get("geometry") if record.spatial_geojson else None
        }

    return {
        "record_identifier": record.record_unique_identifier,
        "ulp_in": record.state_portal_reference_id,
        "cadastral_jurisdiction": {
            "state": record.state_name,
            "district": record.district_name,
            "tehsil": record.tehsil_name,
            "village": record.village_name,
            "pincode": record.pincode
        },
        "landholder": {
            "primary_owner": record.primary_owner_name,
            "transliterated": record.owner_name_transliterated,
            "lineage": record.father_guardian_name
        },
        "cadastral_metrics": {
            "khasra": record.khasra_number,
            "khata": record.khata_number,
            "area_hectares": record.total_area_hectares,
            "area_acres": record.total_area_acres,
            "land_use": record.land_use_classification,
            "land_revenue_tax_inr": record.land_revenue_tax_inr
        },
        "extracted_fields": [
            {
                "key": f.field_key,
                "label": f.field_label,
                "value": f.edited_value or f.raw_ocr_value,
                "confidence": f.confidence_score,
                "manually_edited": f.is_manually_edited
            }
            for f in fields
        ],
        "validation_ledger": [
            {
                "rule": v.rule_code,
                "status": v.status,
                "message": v.error_message or "Verified OK"
            }
            for v in validations
        ]
    }
