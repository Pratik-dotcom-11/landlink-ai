from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CadastralSearchQuery(BaseModel):
    query: Optional[str] = Field(default=None, description="Free text query matching owner, khasra, village, or ULPIN")
    khasra_number: Optional[str] = None
    primary_owner_name: Optional[str] = None
    state_name: Optional[str] = None
    district_name: Optional[str] = None
    tehsil_name: Optional[str] = None
    village_name: Optional[str] = None
    verification_status: Optional[str] = None
    is_disputed: Optional[bool] = None
    min_confidence: Optional[float] = None
    page: int = 1
    limit: int = 20


class CadastralSearchResultItem(BaseModel):
    id: str
    record_unique_identifier: str
    state_portal_reference_id: Optional[str] = None
    khasra_number: str
    primary_owner_name: str
    father_guardian_name: Optional[str] = None
    state_name: str
    district_name: str
    tehsil_name: str
    village_name: str
    total_area_hectares: float
    total_area_acres: float
    land_use_classification: str
    overall_confidence_score: float
    verification_status: str
    is_disputed: bool
    document_id: str
    document_code: Optional[str] = None

    class Config:
        from_attributes = True


class CadastralSearchResponse(BaseModel):
    items: List[CadastralSearchResultItem]
    total: int
    page: int
    limit: int
    total_pages: int
    facets: Optional[Dict[str, Any]] = None


class SearchFacetResponse(BaseModel):
    states: List[str]
    districts: List[str]
    tehsils: List[str]
    record_types: List[str]
    verification_statuses: List[str]
