from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered government or operational email")
    password: str = Field(..., min_length=6, description="User account password")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user_id: str
    email: str
    role: str
    full_name: str


class PermissionResponse(BaseModel):
    id: str
    code: str
    module: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    is_system_role: bool
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role_id: str
    employee_id: Optional[str] = None
    department: Optional[str] = "Revenue & Land Reforms"
    designation: Optional[str] = "Data Operator"
    phone_number: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    employee_id: Optional[str] = None
    department: str
    designation: str
    phone_number: Optional[str] = None
    is_active: bool
    is_email_verified: bool
    role: Optional[RoleResponse] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CurrentUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    employee_id: Optional[str] = None
    department: str
    designation: str
    role_code: str
    role_name: str
    permissions: List[str]
    is_active: bool

    class Config:
        from_attributes = True
