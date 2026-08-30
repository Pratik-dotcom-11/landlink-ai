import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import settings

logger = logging.getLogger("landrecords.db")

# Database Engine Configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI Dependency for database session lifecycle management.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    Creates all database tables defined in models.
    """
    # Import all models to ensure they are registered with Base.metadata
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")


def seed_db(db: Session) -> None:
    """
    Populates default roles, permissions, users, documents, records, and verification tasks
    if the database is currently unpopulated.
    """
    from app.models.user import Role, Permission, RolePermission, User
    from app.models.document import Document, DocumentPage, ProcessingJob, OCRResult
    from app.models.land_record import LandRecord, LandRecordField
    from app.models.validation import ValidationResult
    from app.models.verification import VerificationTask
    from app.models.audit import AuditLog
    from app.core.security import get_password_hash

    # Check if roles already exist
    if db.query(Role).first():
        return

    logger.info("Seeding initial cadastral database fixtures...")

    # 1. Roles
    roles_data = [
        {"id": "11111111-1111-1111-1111-111111111101", "code": "SUPER_ADMIN", "name": "Super Administrator", "description": "National / State Technical Director with full governance"},
        {"id": "11111111-1111-1111-1111-111111111102", "code": "ADMIN", "name": "District Administrator", "description": "District Collectorate admin managing users, rules and SLAs"},
        {"id": "11111111-1111-1111-1111-111111111103", "code": "DATA_OPERATOR", "name": "Cadastral Data Operator", "description": "Scanning vendor and tehsil operator uploading batches"},
        {"id": "11111111-1111-1111-1111-111111111104", "code": "VERIFIER", "name": "Revenue Verifier / Patwari", "description": "Revenue Inspector performing side-by-side verification"},
        {"id": "11111111-1111-1111-1111-111111111105", "code": "REVENUE_OFFICER", "name": "Tehsildar / Sub-Divisional Magistrate", "description": "Statutory authority executing final legal approval"},
        {"id": "11111111-1111-1111-1111-111111111106", "code": "VIEWER", "name": "Public / Citizen Viewer", "description": "Read-only access for citizen search and land search"},
        {"id": "11111111-1111-1111-1111-111111111107", "code": "AUDITOR", "name": "Statutory Compliance Auditor", "description": "Independent auditor reviewing tamper-evident ledgers"},
    ]
    for r in roles_data:
        db.add(Role(id=r["id"], code=r["code"], name=r["name"], description=r["description"], is_system_role=True))
    db.flush()

    # 2. Permissions
    permissions_data = [
        {"id": "22222222-2222-2222-2222-222222222201", "code": "DOC_UPLOAD", "module": "DOCUMENT", "description": "Upload scanned land record deeds and batch files"},
        {"id": "22222222-2222-2222-2222-222222222202", "code": "DOC_VIEW", "module": "DOCUMENT", "description": "View uploaded documents and page previews"},
        {"id": "22222222-2222-2222-2222-222222222203", "code": "DOC_DELETE", "module": "DOCUMENT", "description": "Delete erroneous or corrupted document uploads"},
        {"id": "22222222-2222-2222-2222-222222222204", "code": "OCR_TRIGGER", "module": "PIPELINE", "description": "Trigger Gemini multimodal AI extraction pipeline"},
        {"id": "22222222-2222-2222-2222-222222222205", "code": "TASK_CLAIM", "module": "VERIFICATION", "description": "Claim queued human verification tasks"},
        {"id": "22222222-2222-2222-2222-222222222206", "code": "TASK_SUBMIT", "module": "VERIFICATION", "description": "Save field corrections and submit record approval"},
        {"id": "22222222-2222-2222-2222-222222222207", "code": "TASK_REJECT", "module": "VERIFICATION", "description": "Reject unreadable or fraudulent deed scans"},
        {"id": "22222222-2222-2222-2222-222222222208", "code": "AUDIT_INSPECT", "module": "SECURITY", "description": "View and export immutable audit logs and diffs"},
        {"id": "22222222-2222-2222-2222-222222222209", "code": "USER_MANAGE", "module": "ADMIN", "description": "Provision users and manage role assignments"},
        {"id": "22222222-2222-2222-2222-222222222210", "code": "ANALYTICS_VIEW", "module": "ANALYTICS", "description": "Access district accuracy and throughput dashboards"},
    ]
    for p in permissions_data:
        db.add(Permission(id=p["id"], code=p["code"], module=p["module"], description=p["description"]))
    db.flush()

    # Role Permissions
    admin_role_id = "11111111-1111-1111-1111-111111111102"
    for p in permissions_data:
        db.add(RolePermission(role_id=admin_role_id, permission_id=p["id"]))

    operator_role_id = "11111111-1111-1111-1111-111111111103"
    for pid in ["22222222-2222-2222-2222-222222222201", "22222222-2222-2222-2222-222222222202", "22222222-2222-2222-2222-222222222204"]:
        db.add(RolePermission(role_id=operator_role_id, permission_id=pid))

    verifier_role_id = "11111111-1111-1111-1111-111111111104"
    for pid in ["22222222-2222-2222-2222-222222222202", "22222222-2222-2222-2222-222222222205", "22222222-2222-2222-2222-222222222206", "22222222-2222-2222-2222-222222222207"]:
        db.add(RolePermission(role_id=verifier_role_id, permission_id=pid))

    db.flush()

    # 3. Users (password: demo123)
    default_pw_hash = get_password_hash("demo123")
    users_data = [
        {
            "id": "33333333-3333-3333-3333-333333333301",
            "role_id": admin_role_id,
            "email": "admin.rajesh@landrecords.gov.in",
            "password_hash": default_pw_hash,
            "full_name": "Rajesh Sharma",
            "employee_id": "EMP-ADM-001",
            "department": "Dept of Land Resources",
            "designation": "Director (IT & Digitization)",
            "phone_number": "+91-9810012345",
        },
        {
            "id": "33333333-3333-3333-3333-333333333302",
            "role_id": verifier_role_id,
            "email": "verifier.priya@landrecords.gov.in",
            "password_hash": default_pw_hash,
            "full_name": "Priya Verma",
            "employee_id": "EMP-REV-104",
            "department": "Revenue & Land Reforms",
            "designation": "Senior Revenue Inspector (Patwari)",
            "phone_number": "+91-9820023456",
        },
        {
            "id": "33333333-3333-3333-3333-333333333303",
            "role_id": operator_role_id,
            "email": "operator.amit@landrecords.gov.in",
            "password_hash": default_pw_hash,
            "full_name": "Amit Patel",
            "employee_id": "EMP-OPS-215",
            "department": "Tehsil Sehore Data Center",
            "designation": "Lead Digitization Operator",
            "phone_number": "+91-9830034567",
        },
    ]
    for u in users_data:
        db.add(User(
            id=u["id"],
            role_id=u["role_id"],
            email=u["email"],
            password_hash=u["password_hash"],
            full_name=u["full_name"],
            employee_id=u["employee_id"],
            department=u["department"],
            designation=u["designation"],
            phone_number=u["phone_number"],
            is_active=True,
            is_email_verified=True
        ))
    db.flush()

    # 4. Documents
    doc1_id = "44444444-4444-4444-4444-444444444401"
    doc2_id = "44444444-4444-4444-4444-444444444402"
    doc3_id = "44444444-4444-4444-4444-444444444403"

    db.add(Document(
        id=doc1_id,
        document_unique_code="DOC-MP-SEH-2026-001",
        original_filename="khasra_panchsala_mp_sehore_142.svg",
        storage_path="/storage/documents/2026/08/mp_khasra_142.svg",
        file_type="svg",
        mime_type="image/svg+xml",
        file_size_bytes=248560,
        file_hash_sha256="8f9b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b",
        state_code="MP",
        state_name="Madhya Pradesh",
        district_name="Sehore",
        tehsil_name="Sehore",
        village_name="Rampur",
        primary_language="Hindi",
        script_type="Devanagari",
        total_pages=1,
        status="PENDING_VERIFICATION",
        uploaded_by="33333333-3333-3333-3333-333333333303",
        raw_document_metadata={"scanner": "Fujitsu fi-7700", "dpi": 300}
    ))

    db.add(Document(
        id=doc2_id,
        document_unique_code="DOC-MH-PUN-2026-002",
        original_filename="satbara_712_pune_haveli_284.pdf",
        storage_path="/storage/documents/2026/08/mh_satbara_284.pdf",
        file_type="pdf",
        mime_type="application/pdf",
        file_size_bytes=1450200,
        file_hash_sha256="7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
        state_code="MH",
        state_name="Maharashtra",
        district_name="Pune",
        tehsil_name="Haveli",
        village_name="Wagholi",
        primary_language="Marathi",
        script_type="Devanagari",
        total_pages=2,
        status="VERIFIED_APPROVED",
        uploaded_by="33333333-3333-3333-3333-333333333303",
        raw_document_metadata={"scanner": "Kodak Alaris i3450", "dpi": 400}
    ))

    db.add(Document(
        id=doc3_id,
        document_unique_code="DOC-WB-NAD-2026-003",
        original_filename="ror_porcha_nadia_chakdaha_719.png",
        storage_path="/storage/documents/2026/08/wb_porcha_719.png",
        file_type="png",
        mime_type="image/png",
        file_size_bytes=3845000,
        file_hash_sha256="3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e",
        state_code="WB",
        state_name="West Bengal",
        district_name="Nadia",
        tehsil_name="Chakdaha",
        village_name="Madanpur",
        primary_language="Bengali",
        script_type="Eastern Nagari",
        total_pages=1,
        status="PENDING_VERIFICATION",
        uploaded_by="33333333-3333-3333-3333-333333333303",
        raw_document_metadata={"scanner": "Epson DS-50000", "dpi": 300}
    ))
    db.flush()

    # 5. Land Records
    rec1_id = "88888888-8888-8888-8888-888888888801"
    rec2_id = "88888888-8888-8888-8888-888888888802"

    db.add(LandRecord(
        id=rec1_id,
        document_id=doc1_id,
        record_unique_identifier="LR-MP-SEH-142/1-2026",
        state_portal_reference_id="ULPIN-23-4589-1048-2891",
        record_type="Khasra Khatauni Panchsala",
        khasra_number="142/1",
        khata_number="58",
        survey_number="142",
        primary_owner_name="रामेश्वर प्रसाद",
        owner_name_transliterated="Rameshwar Prasad",
        father_guardian_name="श्यामलाल शर्मा (Shyamlal Sharma)",
        state_name="Madhya Pradesh",
        district_name="Sehore",
        tehsil_name="Sehore",
        village_name="Rampur",
        total_area_hectares=2.4500,
        total_area_acres=6.0540,
        original_area_value=4.9000,
        original_area_unit="Bigha",
        land_use_classification="Irrigated Multi-Crop Agriculture",
        soil_classification="Black Cotton / Loam",
        irrigation_source="Canal & Private Tube Well",
        land_revenue_tax_inr=185.50,
        overall_confidence_score=0.7850,
        is_auto_approved=False,
        verification_status="PENDING_VERIFICATION",
        spatial_geojson={
            "type": "Feature",
            "properties": {"khasra": "142/1", "village": "Rampur"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[77.0851, 23.1982], [77.0875, 23.1985], [77.0872, 23.1958], [77.0848, 23.1955], [77.0851, 23.1982]]]
            }
        }
    ))

    db.add(LandRecord(
        id=rec2_id,
        document_id=doc2_id,
        record_unique_identifier="LR-MH-PUN-284-2026",
        state_portal_reference_id="ULPIN-27-8912-4019-9942",
        record_type="Record of Rights (7/12 Satbara)",
        khasra_number="284",
        khata_number="112",
        survey_number="284",
        primary_owner_name="विठ्ठल तुकाराम जगताप",
        owner_name_transliterated="Vitthal Tukaram Jagtap",
        father_guardian_name="तुकाराम जगताप (Tukaram Jagtap)",
        state_name="Maharashtra",
        district_name="Pune",
        tehsil_name="Haveli",
        village_name="Wagholi",
        total_area_hectares=1.2000,
        total_area_acres=2.9650,
        original_area_value=1.2000,
        original_area_unit="Hectares",
        land_use_classification="Agricultural / Semi-Urban",
        soil_classification="Medium Black",
        irrigation_source="Well Irrigation",
        land_revenue_tax_inr=240.00,
        overall_confidence_score=0.9420,
        is_auto_approved=True,
        verification_status="VERIFIED_APPROVED",
        spatial_geojson={
            "type": "Feature",
            "properties": {"gat_no": "284", "village": "Wagholi"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[73.9851, 18.5782], [73.9875, 18.5785], [73.9872, 18.5758], [73.9848, 18.5755], [73.9851, 18.5782]]]
            }
        }
    ))
    db.flush()

    # 6. Land Record Fields
    fields_data = [
        {"id": "99999999-9999-9999-9999-999999999901", "land_record_id": rec1_id, "document_id": doc1_id, "field_key": "ownerName", "field_label": "Primary Landowner Name", "field_category": "OWNER", "raw_ocr_value": "रामेश्वर प्रसाद", "standardized_value": "Rameshwar Prasad", "data_type": "STRING", "confidence_score": 0.7200, "confidence_tier": "MEDIUM", "bounding_box_x": 15.5, "bounding_box_y": 22.4, "bounding_box_width": 35.0, "bounding_box_height": 4.5},
        {"id": "99999999-9999-9999-9999-999999999902", "land_record_id": rec1_id, "document_id": doc1_id, "field_key": "khasraNumber", "field_label": "Khasra / Survey Number", "field_category": "PARCEL", "raw_ocr_value": "142/1", "standardized_value": "142/1", "data_type": "STRING", "confidence_score": 0.9100, "confidence_tier": "HIGH", "bounding_box_x": 52.0, "bounding_box_y": 22.4, "bounding_box_width": 18.5, "bounding_box_height": 4.5},
        {"id": "99999999-9999-9999-9999-999999999903", "land_record_id": rec1_id, "document_id": doc1_id, "field_key": "plotAreaHectares", "field_label": "Cadastral Plot Area (Hectares)", "field_category": "AREA", "raw_ocr_value": "2.450", "standardized_value": "2.4500", "data_type": "NUMERIC", "confidence_score": 0.5400, "confidence_tier": "LOW", "bounding_box_x": 72.0, "bounding_box_y": 22.4, "bounding_box_width": 15.0, "bounding_box_height": 4.5},
        {"id": "99999999-9999-9999-9999-999999999904", "land_record_id": rec1_id, "document_id": doc1_id, "field_key": "fatherName", "field_label": "Father / Guardian Lineage Name", "field_category": "OWNER", "raw_ocr_value": "श्यामलाल शर्मा", "standardized_value": "Shyamlal Sharma", "data_type": "STRING", "confidence_score": 0.8800, "confidence_tier": "HIGH", "bounding_box_x": 15.5, "bounding_box_y": 28.0, "bounding_box_width": 35.0, "bounding_box_height": 4.5},
    ]
    for f in fields_data:
        db.add(LandRecordField(**f))
    db.flush()

    # 7. Validation Results
    val_data = [
        {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", "land_record_id": rec1_id, "rule_code": "VAL-AREA-SUM", "rule_category": "MATHEMATICAL", "rule_name": "Sub-Plot Area Summation Integrity", "rule_description": "Verifies that individual sub-plots sum to total area", "status": "PASS", "severity": "LOW", "expected_value": "2.4500 Ha", "actual_value": "2.4500 Ha", "error_message": None, "resolution_suggestion": "Area calculation matches record header.", "is_blocking": False},
        {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", "land_record_id": rec1_id, "rule_code": "VAL-CONF-THRESH", "rule_category": "LEXICAL", "rule_name": "Minimum OCR Confidence Threshold Check", "rule_description": "Checks if critical legal identifiers meet >= 85% baseline", "status": "WARNING", "severity": "HIGH", "expected_value": ">= 0.8500", "actual_value": "0.5400", "error_message": "Plot area numeral was faded on original scan and scored 54% confidence.", "resolution_suggestion": "Inspect document canvas and verify decimal placement.", "is_blocking": True},
        {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3", "land_record_id": rec1_id, "rule_code": "VAL-SEAL-SIGN", "rule_category": "SYNTACTIC", "rule_name": "Official Tehsildar Seal & Digital Stamp Verification", "rule_description": "Verifies presence of government emblem seal", "status": "PASS", "severity": "INFO", "expected_value": "Seal Detected", "actual_value": "Tehsildar Sehore Circular Seal Detected", "error_message": None, "resolution_suggestion": "Document authenticity marker valid.", "is_blocking": False},
    ]
    for v in val_data:
        db.add(ValidationResult(**v))
    db.flush()

    # 8. Verification Tasks
    task_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
    db.add(VerificationTask(
        id=task_id,
        land_record_id=rec1_id,
        document_id=doc1_id,
        task_code="TSK-MP-2026-00891",
        priority="HIGH",
        status="IN_PROGRESS",
        assigned_verifier_id="33333333-3333-3333-3333-333333333302",
        assigned_at=datetime.now(timezone.utc),
        claimed_at=datetime.now(timezone.utc),
        verifier_notes="Currently verifying faded area decimals on Column 4 of MP Khasra table."
    ))

    # 9. Audit Logs
    db.add(AuditLog(
        id="cccccccc-cccc-cccc-cccc-cccccccccc01",
        event_type="DOCUMENT_UPLOAD",
        entity_name="documents",
        entity_id=doc1_id,
        user_id="33333333-3333-3333-3333-333333333303",
        user_role="DATA_OPERATOR",
        ip_address="127.0.0.1",
        user_agent="FastAPI Backend Client",
        action_summary="Uploaded scanned cadastral deed khasra_panchsala_mp_sehore_142.svg for Sehore district",
        new_state={"document_code": "DOC-MP-SEH-2026-001", "size_kb": 248, "status": "UPLOADED"}
    ))

    db.commit()
    logger.info("Database seeding completed successfully.")
