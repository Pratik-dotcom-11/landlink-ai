from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.land_records import router as records_router
from app.api.v1.validation import router as validation_router
from app.api.v1.verification import router as verification_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.search import router as search_router
from app.api.v1.audit import router as audit_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(records_router)
api_v1_router.include_router(validation_router)
api_v1_router.include_router(verification_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(audit_router)
