from enum import Enum
from typing import List, Optional, Callable
from fastapi import Depends, Header, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, Role, Permission
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging import logger


class RoleEnum(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    DATA_OPERATOR = "DATA_OPERATOR"
    VERIFIER = "VERIFIER"
    REVENUE_OFFICER = "REVENUE_OFFICER"
    VIEWER = "VIEWER"
    AUDITOR = "AUDITOR"


class PermissionEnum(str, Enum):
    DOC_UPLOAD = "DOC_UPLOAD"
    DOC_VIEW = "DOC_VIEW"
    DOC_DELETE = "DOC_DELETE"
    OCR_TRIGGER = "OCR_TRIGGER"
    TASK_CLAIM = "TASK_CLAIM"
    TASK_SUBMIT = "TASK_SUBMIT"
    TASK_REJECT = "TASK_REJECT"
    AUDIT_INSPECT = "AUDIT_INSPECT"
    USER_MANAGE = "USER_MANAGE"
    ANALYTICS_VIEW = "ANALYTICS_VIEW"


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False
)


def get_token_from_header(
    auth_header: Optional[str] = Header(None, alias="Authorization"),
    bearer_token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[str]:
    """
    Extracts Bearer token from either Authorization header or OAuth2 scheme.
    """
    if bearer_token:
        return bearer_token
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "").strip()
    return None


def get_current_user(
    token: Optional[str] = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates JWT token and fetches authenticated active user from database.
    """
    if not token:
        raise UnauthorizedException("Authentication token is missing. Please provide a valid Bearer token.")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid, expired, or malformed authentication token.")

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("Authenticated user account no longer exists.")

    if not user.is_active:
        raise ForbiddenException("Your user account has been deactivated. Please contact your administrator.")

    return user


def get_optional_current_user(
    token: Optional[str] = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication dependency for endpoints that allow guest or enhanced authenticated views.
    """
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    return db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()


def require_roles(*allowed_roles: RoleEnum) -> Callable:
    """
    Decorator dependency ensuring current user has one of the allowed roles.
    SUPER_ADMIN always bypasses role restrictions.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_code = current_user.role.code if current_user.role else None
        
        # Super admin always granted
        if user_role_code == RoleEnum.SUPER_ADMIN.value:
            return current_user

        allowed_values = [r.value if isinstance(r, RoleEnum) else str(r) for r in allowed_roles]
        if user_role_code not in allowed_values:
            logger.warning(
                f"RBAC Access Denied: User {current_user.email} (Role: {user_role_code}) "
                f"attempted to access endpoint requiring {allowed_values}"
            )
            raise ForbiddenException(
                f"Access denied. Required role(s): {', '.join(allowed_values)}. Your role: {user_role_code}"
            )
        return current_user

    return role_checker


def require_permissions(*required_perms: PermissionEnum) -> Callable:
    """
    Decorator dependency ensuring current user has all required permissions.
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role
        if not user_role:
            raise ForbiddenException("User does not have an assigned system role.")

        if user_role.code == RoleEnum.SUPER_ADMIN.value:
            return current_user

        user_perm_codes = {p.code for p in user_role.permissions}
        required_codes = [p.value if isinstance(p, PermissionEnum) else str(p) for p in required_perms]

        missing = [code for code in required_codes if code not in user_perm_codes]
        if missing:
            logger.warning(
                f"RBAC Permission Denied: User {current_user.email} missing permissions: {missing}"
            )
            raise ForbiddenException(
                f"Access denied. Missing permission(s): {', '.join(missing)}"
            )
        return current_user

    return permission_checker
