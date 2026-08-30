import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import init_db, seed_db, SessionLocal
from app.api.v1.router import api_v1_router
from app.schemas.common import HealthResponse, StandardResponse
from app.core.exceptions import AppException
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup and shutdown routines.
    """
    logger.info("Initializing DoLR Cadastral Backend Database...")
    init_db()
    
    # Seed initial system roles, permissions, users and records if database is new
    db = SessionLocal()
    try:
        seed_db(db)
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} initialized and ready.")
    yield
    logger.info("Shutting down DoLR Cadastral Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
# Intelligent Land Record Digitization & Multi-Modal Validation System API

State-of-the-art API for Indian Cadastral and Revenue Land Record Digitization:
* **Multilingual Indic OCR**: Support for Hindi, Marathi, Bengali, Gujarati, Urdu, Tamil, Telugu.
* **Cadastral Validation Rules**: Cross-field area summations, Khasra/Plot syntax verification, and official seal validation.
* **Human-in-the-Loop Verifier Workspace**: Side-by-side deed inspection, bounding box field editing, and draft saves.
* **Cryptographic & Immutable Audit Trail**: Complete lineage tracking of every digitizer edit and registrar certification.
* **Granular Role-Based Access Control (RBAC)**: Strict role segregation (Super Admin, District Admin, Verifier/Patwari, Data Operator, Public Viewer).
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Request Logging & Timing Middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} ({duration_ms}ms)")
    return response


# 3. Global Exception Handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_code": exc.error_code,
            "detail": exc.detail,
            "extra": exc.extra
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err.get("loc", [])])
        errors.append(f"{loc}: {err.get('msg', 'Validation error')}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_code": "REQUEST_VALIDATION_ERROR",
            "detail": "; ".join(errors),
            "errors": exc.errors()
        }
    )


# 4. Health Check Endpoints
@app.get("/health", response_model=HealthResponse, tags=["Health Check"])
@app.get(f"{settings.API_V1_PREFIX}/health", response_model=HealthResponse, tags=["Health Check"])
def health_check():
    """
    Health check endpoint for container orchestrators and load balancers.
    """
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database="connected",
        timestamp=datetime.now(timezone.utc).isoformat()
    )


# 5. Include API Routers
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
