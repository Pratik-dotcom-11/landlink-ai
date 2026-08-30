from typing import Generic, List, Optional, TypeVar, Any
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number starting at 1")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page (1-100)")


class PaginatedResponse(BaseModel, Generic[DataT]):
    items: List[DataT]
    total: int = Field(..., description="Total count of matching items")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class StandardResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Any] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    database: str
    timestamp: str
