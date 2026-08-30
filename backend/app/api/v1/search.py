from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models.land_record import LandRecord
from app.models.document import Document
from app.models.user import User
from app.schemas.search import (
    CadastralSearchResponse, CadastralSearchResultItem, SearchFacetResponse
)
from app.core.rbac import get_current_user

router = APIRouter(prefix="/search", tags=["Cadastral Search & Discovery"])


@router.get("/cadastral", response_model=CadastralSearchResponse, summary="Multi-Field Cadastral Record Search")
def search_cadastral_records(
    query: Optional[str] = Query(None, description="Global text search matching owner, khasra, village, or ULPIN"),
    khasra_number: Optional[str] = None,
    primary_owner_name: Optional[str] = None,
    state_name: Optional[str] = None,
    district_name: Optional[str] = None,
    tehsil_name: Optional[str] = None,
    village_name: Optional[str] = None,
    verification_status: Optional[str] = None,
    is_disputed: Optional[bool] = None,
    min_confidence: Optional[float] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    High-performance cadastral search with fuzzy Hindi/Indic names, survey plot numbers, and state filters.
    """
    db_query = db.query(LandRecord).outerjoin(Document)

    if query:
        search_term = f"%{query.strip()}%"
        db_query = db_query.filter(
            or_(
                LandRecord.primary_owner_name.ilike(search_term),
                LandRecord.owner_name_transliterated.ilike(search_term),
                LandRecord.khasra_number.ilike(search_term),
                LandRecord.survey_number.ilike(search_term),
                LandRecord.village_name.ilike(search_term),
                LandRecord.record_unique_identifier.ilike(search_term),
                LandRecord.state_portal_reference_id.ilike(search_term)
            )
        )

    if khasra_number:
        db_query = db_query.filter(LandRecord.khasra_number.ilike(f"%{khasra_number}%"))
    if primary_owner_name:
        db_query = db_query.filter(
            or_(
                LandRecord.primary_owner_name.ilike(f"%{primary_owner_name}%"),
                LandRecord.owner_name_transliterated.ilike(f"%{primary_owner_name}%")
            )
        )
    if state_name:
        db_query = db_query.filter(LandRecord.state_name.ilike(f"%{state_name}%"))
    if district_name:
        db_query = db_query.filter(LandRecord.district_name.ilike(f"%{district_name}%"))
    if tehsil_name:
        db_query = db_query.filter(LandRecord.tehsil_name.ilike(f"%{tehsil_name}%"))
    if village_name:
        db_query = db_query.filter(LandRecord.village_name.ilike(f"%{village_name}%"))
    if verification_status:
        db_query = db_query.filter(LandRecord.verification_status == verification_status)
    if is_disputed is not None:
        db_query = db_query.filter(LandRecord.is_disputed == is_disputed)
    if min_confidence is not None:
        db_query = db_query.filter(LandRecord.overall_confidence_score >= min_confidence)

    total = db_query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    records = db_query.order_by(desc(LandRecord.created_at)).offset((page - 1) * limit).limit(limit).all()

    items = []
    for r in records:
        item = CadastralSearchResultItem.model_validate(r)
        if r.document:
            item.document_code = r.document.document_unique_code
        items.append(item)

    return CadastralSearchResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/facets", response_model=SearchFacetResponse, summary="Get Search Filter Options & Facets")
def get_search_facets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns unique states, districts, and record types present in the digitized archive.
    """
    states = [s[0] for s in db.query(LandRecord.state_name).distinct().all() if s[0]]
    districts = [d[0] for d in db.query(LandRecord.district_name).distinct().all() if d[0]]
    tehsils = [t[0] for t in db.query(LandRecord.tehsil_name).distinct().all() if t[0]]
    types = [r[0] for r in db.query(LandRecord.record_type).distinct().all() if r[0]]
    statuses = [s[0] for s in db.query(LandRecord.verification_status).distinct().all() if s[0]]

    return SearchFacetResponse(
        states=states or ["Madhya Pradesh", "Maharashtra", "West Bengal", "Uttar Pradesh", "Rajasthan"],
        districts=districts or ["Sehore", "Pune", "Nadia", "Lucknow", "Jaipur"],
        tehsils=tehsils or ["Sehore", "Haveli", "Chakdaha", "Sadar"],
        record_types=types or ["Record of Rights (7/12)", "Khasra Khatauni Panchsala", "ROR Porcha"],
        verification_statuses=statuses or ["PENDING_VERIFICATION", "VERIFIED_APPROVED", "REJECTED"]
    )
