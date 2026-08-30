from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ValidationResultResponse(BaseModel):
    id: str
    land_record_id: str
    job_id: Optional[str] = None
    rule_code: str
    rule_category: str
    rule_name: str
    rule_description: Optional[str] = None
    status: str
    severity: str
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    error_message: Optional[str] = None
    resolution_suggestion: Optional[str] = None
    is_blocking: bool
    executed_at: datetime

    class Config:
        from_attributes = True


class ValidationSummaryResponse(BaseModel):
    record_id: str
    total_rules_evaluated: int
    passed_count: int
    warning_count: int
    failed_count: int
    is_blocking_error_present: bool
    results: List[ValidationResultResponse]


class RuleDefinition(BaseModel):
    code: str
    category: str
    name: str
    description: str
    severity: str
    is_blocking: bool
