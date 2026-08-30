from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentPageResponse(BaseModel):
    id: str
    page_number: int
    page_storage_path: str
    width_pixels: Optional[int] = None
    height_pixels: Optional[int] = None
    resolution_dpi: Optional[int] = 300
    rotation_degrees: Optional[int] = 0
    status: str

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    document_unique_code: str
    original_filename: str
    storage_path: str
    file_type: str
    mime_type: str
    file_size_bytes: int
    file_hash_sha256: str
    state_code: str
    state_name: str
    district_name: str
    tehsil_name: Optional[str] = None
    village_name: Optional[str] = None
    primary_language: str
    script_type: str
    total_pages: int
    status: str
    uploaded_by: str
    raw_document_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    land_record_id: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class DocumentUploadMetadata(BaseModel):
    state_code: str = Field(..., example="MP")
    state_name: str = Field(..., example="Madhya Pradesh")
    district_name: str = Field(..., example="Sehore")
    tehsil_name: Optional[str] = Field(default="Sehore")
    village_name: Optional[str] = Field(default="Rampur")
    primary_language: Optional[str] = Field(default="Hindi")
    script_type: Optional[str] = Field(default="Devanagari")
    auto_trigger_ocr: Optional[bool] = Field(default=True)


class BatchProcessRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1, description="List of Document IDs to process")
    engine_name: Optional[str] = Field(default="Gemini-Multimodal-Spatial-OCR-v2.5")
    force_reprocess: Optional[bool] = False


class BatchProcessResponse(BaseModel):
    total_requested: int
    queued_count: int
    skipped_count: int
    job_ids: List[str]
    message: str
