from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field


class LandRecordFieldSchema(BaseModel):
    id: str
    land_record_id: str
    document_id: str
    page_id: Optional[str] = None
    field_key: str
    field_label: str
    field_category: str
    raw_ocr_value: str
    standardized_value: str
    data_type: str
    confidence_score: float
    confidence_tier: str
    bounding_box_x: Optional[float] = None
    bounding_box_y: Optional[float] = None
    bounding_box_width: Optional[float] = None
    bounding_box_height: Optional[float] = None
    is_manually_edited: bool
    original_ai_value: Optional[str] = None
    edited_value: Optional[str] = None
    edited_by: Optional[str] = None
    edited_at: Optional[datetime] = None
    verification_notes: Optional[str] = None

    class Config:
        from_attributes = True


class LandRecordFieldUpdate(BaseModel):
    edited_value: str = Field(..., description="Corrected human-verified field value")
    verification_notes: Optional[str] = Field(default=None, description="Reason or justification for correction")


class LandRecordUpdate(BaseModel):
    primary_owner_name: Optional[str] = None
    owner_name_transliterated: Optional[str] = None
    father_guardian_name: Optional[str] = None
    khasra_number: Optional[str] = None
    khata_number: Optional[str] = None
    survey_number: Optional[str] = None
    total_area_hectares: Optional[float] = None
    total_area_acres: Optional[float] = None
    original_area_value: Optional[float] = None
    original_area_unit: Optional[str] = None
    land_use_classification: Optional[str] = None
    soil_classification: Optional[str] = None
    irrigation_source: Optional[str] = None
    land_revenue_tax_inr: Optional[float] = None
    tenure_type: Optional[str] = None
    is_disputed: Optional[bool] = None
    dispute_details: Optional[str] = None


class LandRecordResponse(BaseModel):
    id: str
    document_id: str
    record_unique_identifier: str
    state_portal_reference_id: Optional[str] = None
    record_type: str
    khasra_number: str
    khata_number: Optional[str] = None
    khatauni_number: Optional[str] = None
    survey_number: Optional[str] = None
    plot_number: Optional[str] = None
    primary_owner_name: str
    owner_name_transliterated: Optional[str] = None
    father_guardian_name: Optional[str] = None
    co_owners_count: int
    co_owners_details: Optional[List[Dict[str, Any]]] = []
    state_name: str
    district_name: str
    tehsil_name: str
    revenue_circle_ri: Optional[str] = None
    village_name: str
    pincode: Optional[str] = None
    total_area_hectares: float
    total_area_acres: float
    original_area_value: float
    original_area_unit: str
    land_use_classification: str
    soil_classification: Optional[str] = None
    irrigation_source: Optional[str] = None
    land_revenue_tax_inr: float
    tenure_type: Optional[str] = None
    is_disputed: bool
    dispute_details: Optional[str] = None
    overall_confidence_score: float
    is_auto_approved: bool
    verification_status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LandRecordDetailResponse(LandRecordResponse):
    spatial_geojson: Optional[Dict[str, Any]] = None
    record_metadata: Optional[Dict[str, Any]] = None
    fields: List[LandRecordFieldSchema] = []
    validation_results_summary: Optional[Dict[str, Any]] = None


class LandRecordListResponse(BaseModel):
    items: List[LandRecordResponse]
    total: int
    page: int
    limit: int
    total_pages: int
