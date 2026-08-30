import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, Role, Permission, UserSession
from app.schemas.auth import (
    LoginRequest, Token, UserCreate, UserUpdate, UserResponse,
    RoleResponse, PermissionResponse, CurrentUserResponse
)
from app.schemas.common import StandardResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.rbac import get_current_user, require_roles, RoleEnum
from app.core.exceptions import UnauthorizedException, ConflictException, EntityNotFoundException
from app.core.audit import log_audit_event
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication & User Access"])


@router.post("/login", response_model=Token, summary="User Authentication & Token Issuance")
def login(
    request: Request,
    body: Optional[LoginRequest] = None,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """
    Authenticates cadastral operators, revenue officers, verifiers, and administrators.
    Supports both JSON body and OAuth2 form specifications.
    """
    email = None
    password = None

    if body and body.email:
        email = body.email.strip().lower()
        password = body.password
    elif form_data and form_data.username:
        email = form_data.username.strip().lower()
        password = form_data.password

    if not email or not password:
        raise UnauthorizedException("Email and password credentials are required.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        logger.warning(f"Failed login attempt for unknown email: {email}")
        raise UnauthorizedException("Invalid email address or password.")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive or disabled.")

    if not verify_password(password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        db.commit()
        logger.warning(f"Invalid password attempt for user: {email}")
        raise UnauthorizedException("Invalid email address or password.")

    # Reset failed attempts and update last login
    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(timezone.utc)
    user.last_login_ip = request.client.host if request.client else "127.0.0.1"

    # Create JWT Token
    expires_in_secs = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    role_code = user.role.code if user.role else "VIEWER"
    permissions = [p.code for p in user.role.permissions] if user.role else []

    token_payload = {
        "sub": user.id,
        "email": user.email,
        "role": role_code,
        "full_name": user.full_name,
        "permissions": permissions
    }

    access_token = create_access_token(
        subject=user.id,
        claims=token_payload,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Record User Session
    session_record = UserSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        session_token_hash=access_token[-32:],  # store last 32 chars for lookup
        ip_address=user.last_login_ip,
        user_agent=request.headers.get("user-agent", "Unknown"),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        is_revoked=False
    )
    db.add(session_record)
    db.commit()

    log_audit_event(
        db=db,
        event_type="USER_LOGIN",
        entity_name="users",
        entity_id=user.id,
        user=user,
        action_summary=f"User {user.email} authenticated successfully with role {role_code}",
        request=request
    )
    db.commit()

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in_seconds=expires_in_secs,
        user_id=user.id,
        email=user.email,
        role=role_code,
        full_name=user.full_name
    )


@router.post("/logout", response_model=StandardResponse, summary="Revoke Active Session")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Terminates active session and records logout in the security audit ledger.
    """
    # Revoke sessions for user
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True})
    
    log_audit_event(
        db=db,
        event_type="USER_LOGOUT",
        entity_name="users",
        entity_id=current_user.id,
        user=current_user,
        action_summary=f"User {current_user.email} logged out successfully",
        request=request
    )
    db.commit()

    return StandardResponse(success=True, message="Session logged out successfully.")


@router.get("/me", response_model=CurrentUserResponse, summary="Get Current Authenticated User Profile")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's details, active role, and granular permission list.
    """
    role_code = current_user.role.code if current_user.role else "VIEWER"
    role_name = current_user.role.name if current_user.role else "Viewer"
    permissions = [p.code for p in current_user.role.permissions] if current_user.role else []

    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        employee_id=current_user.employee_id,
        department=current_user.department,
        designation=current_user.designation,
        role_code=role_code,
        role_name=role_name,
        permissions=permissions,
        is_active=current_user.is_active
    )


@router.get("/roles", response_model=List[RoleResponse], summary="List All System Roles & Permissions")
def get_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the catalog of defined RBAC roles and their associated system permissions.
    """
    roles = db.query(Role).all()
    return roles


@router.get("/users", response_model=List[UserResponse], summary="List Users (Admin)")
def list_users(
    role_code: Optional[str] = None,
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Lists users in the system. Accessible by Administrator and Super Admin roles.
    """
    query = db.query(User)
    if role_code:
        query = query.join(Role).filter(Role.code == role_code)
    users = query.all()
    return users


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create User (Admin)")
def create_user(
    user_in: UserCreate,
    request: Request,
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Provisions a new cadastral operator, verifier, or officer account.
    """
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise ConflictException(f"A user with email '{user_in.email}' already exists.")

    role = db.query(Role).filter(Role.id == user_in.role_id).first()
    if not role:
        raise EntityNotFoundException("Role", user_in.role_id)

    new_user = User(
        id=str(uuid.uuid4()),
        email=user_in.email.lower().strip(),
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role_id=role.id,
        employee_id=user_in.employee_id,
        department=user_in.department or "Revenue & Land Reforms",
        designation=user_in.designation or "Data Operator",
        phone_number=user_in.phone_number,
        is_active=True,
        is_email_verified=True
    )
    db.add(new_user)
    db.flush()

    log_audit_event(
        db=db,
        event_type="USER_PROVISIONED",
        entity_name="users",
        entity_id=new_user.id,
        user=current_user,
        action_summary=f"Admin {current_user.email} created new user account {new_user.email} (Role: {role.code})",
        new_state={"email": new_user.email, "role": role.code, "name": new_user.full_name},
        request=request
    )
    db.commit()
    db.refresh(new_user)
    return new_user
