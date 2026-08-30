from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DashboardSummaryResponse(BaseModel):
    total_documents: int
    processed_documents: int
    auto_approved_records: int
    pending_verification_records: int
    rejected_records: int
    average_ocr_confidence: float
    ocr_success_rate: float
    total_area_digitized_hectares: float
    active_verifiers_count: int


class DistrictProgressItem(BaseModel):
    district_name: str
    state_name: str
    total_records: int
    verified_records: int
    pending_records: int
    accuracy_percentage: float
    digitized_area_ha: float


class LanguageAccuracyItem(BaseModel):
    language: str
    script: str
    documents_count: int
    average_confidence: float
    error_rate: float


class TimelineTrendItem(BaseModel):
    date: str
    documents_ingested: int
    records_verified: int
    auto_approved: int
