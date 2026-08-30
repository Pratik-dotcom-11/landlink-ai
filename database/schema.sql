-- ============================================================================
-- INTELLIGENT LAND RECORD DIGITIZATION & VALIDATION SYSTEM
-- PostgreSQL Database Schema Specification (Production Ready)
-- Target Platform: Department of Land Resources (DoLR) / State Revenue Depts
-- Architecture: Normalized Relational 3NF + Spatial JSONB + Immutable Auditing
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS & SYSTEM PREREQUISITES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean schema drop for repeatable migrations (development/staging)
-- In production, manage via Flyway, Liquibase, or Drizzle migrations
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS verification_tasks CASCADE;
DROP TABLE IF EXISTS validation_results CASCADE;
DROP TABLE IF EXISTS land_record_fields CASCADE;
DROP TABLE IF EXISTS land_records CASCADE;
DROP TABLE IF EXISTS ocr_results CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS document_pages CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ----------------------------------------------------------------------------
-- CUSTOM ENUMERATED TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'SUPER_ADMIN',
        'ADMIN',
        'DATA_OPERATOR',
        'VERIFIER',
        'REVENUE_OFFICER',
        'VIEWER',
        'AUDITOR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status_type AS ENUM (
        'UPLOADED',
        'PREPROCESSING',
        'OCR_PROCESSING',
        'OCR_COMPLETED',
        'VALIDATION_FAILED',
        'PENDING_VERIFICATION',
        'IN_VERIFICATION',
        'VERIFIED_APPROVED',
        'REJECTED',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE page_status_type AS ENUM (
        'PENDING',
        'PROCESSED',
        'FAILED',
        'SKIPPED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_type_enum AS ENUM (
        'DOCUMENT_INGESTION',
        'IMAGE_PREPROCESSING',
        'MULTIMODAL_OCR',
        'LAYOUT_ANALYSIS',
        'CADASTRAL_RULE_VALIDATION',
        'GIS_VECTORIZATION',
        'BATCH_EXPORT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status_enum AS ENUM (
        'QUEUED',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'RETRYING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE confidence_tier_type AS ENUM (
        'HIGH',       -- >= 85% confidence
        'MEDIUM',     -- 60% - 84% confidence
        'LOW'         -- < 60% confidence (Mandatory Review)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE validation_status_type AS ENUM (
        'PASS',
        'WARNING',
        'FAIL',
        'SKIPPED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE validation_severity_type AS ENUM (
        'INFO',
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority_type AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT',
        'EXPEDITED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status_type AS ENUM (
        'UNASSIGNED',
        'ASSIGNED',
        'IN_PROGRESS',
        'AWAITING_SECOND_REVIEW',
        'RESOLVED_APPROVED',
        'RESOLVED_REJECTED',
        'ESCALATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_type AS ENUM (
        'USER_LOGIN',
        'USER_LOGOUT',
        'DOCUMENT_UPLOAD',
        'DOCUMENT_DELETED',
        'OCR_STARTED',
        'OCR_COMPLETED',
        'VALIDATION_EXECUTED',
        'TASK_ASSIGNED',
        'TASK_CLAIMED',
        'FIELD_MANUAL_EDIT',
        'RECORD_APPROVED',
        'RECORD_REJECTED',
        'ROLE_PERMISSION_CHANGED',
        'CONFIG_MODIFIED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- AUTOMATED TIMESTAMP UPDATE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 1. ROLES & PERMISSIONS (Extensible RBAC Subsystem)
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_roles_modtime
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- 2. USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Stored as salted bcrypt ($2b$12$...) or Argon2id
    full_name VARCHAR(150) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100) NOT NULL DEFAULT 'Revenue & Land Reforms',
    designation VARCHAR(100) NOT NULL DEFAULT 'Data Operator',
    phone_number VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_email_verified BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token_hash);

-- ============================================================================
-- 3. DOCUMENTS (Cadastral Scans, RoR Deeds, 7/12 Extracts, Khasra Sheets)
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_unique_code VARCHAR(100) NOT NULL UNIQUE, -- E.g., 'DOC-MP-SEH-2026-00891'
    original_filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,                         -- Path or S3 URI
    file_type VARCHAR(10) NOT NULL,                    -- 'pdf', 'png', 'jpg', 'svg', 'tiff'
    mime_type VARCHAR(100) NOT NULL,                   -- 'application/pdf', 'image/png'
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    file_hash_sha256 CHAR(64) NOT NULL,                -- For deduplication & tamper validation
    
    -- Geographic & Jurisdictional Administrative Hierarchy
    state_code VARCHAR(10) NOT NULL,                   -- e.g., 'MP', 'MH', 'WB', 'UP', 'RJ'
    state_name VARCHAR(100) NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    tehsil_name VARCHAR(100),
    village_name VARCHAR(100),
    
    -- Language & Script Metadata
    primary_language VARCHAR(50) NOT NULL DEFAULT 'Hindi',
    script_type VARCHAR(50) NOT NULL DEFAULT 'Devanagari',
    total_pages INT NOT NULL DEFAULT 1 CHECK (total_pages > 0),
    
    -- Ingestion Status & Operational Ownership
    status document_status_type NOT NULL DEFAULT 'UPLOADED',
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    raw_document_metadata JSONB DEFAULT '{}'::jsonb,   -- Flexible scanner/camera metadata
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_documents_modtime
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_state_district ON documents(state_name, district_name);
CREATE INDEX idx_documents_file_hash ON documents(file_hash_sha256);
CREATE INDEX idx_documents_metadata_gin ON documents USING GIN(raw_document_metadata);

-- ============================================================================
-- 4. DOCUMENT PAGES (Multi-Page Cadastral Bundles)
-- ============================================================================

CREATE TABLE document_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL CHECK (page_number > 0),
    page_storage_path TEXT NOT NULL,
    width_pixels INT,
    height_pixels INT,
    resolution_dpi INT DEFAULT 300,
    rotation_degrees INT NOT NULL DEFAULT 0 CHECK (rotation_degrees IN (0, 90, 180, 270)),
    status page_status_type NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (document_id, page_number)
);

CREATE TRIGGER update_doc_pages_modtime
BEFORE UPDATE ON document_pages
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_document_pages_doc_id ON document_pages(document_id);

-- ============================================================================
-- 5. PROCESSING JOBS (Asynchronous Ingestion, AI Extraction & Validation Pipeline)
-- ============================================================================

CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_type job_type_enum NOT NULL,
    engine_name VARCHAR(100) NOT NULL,                 -- e.g., 'gemini-3.0-multimodal', 'tesseract-ocr'
    engine_version VARCHAR(50) DEFAULT 'v1.0.0',
    status job_status_enum NOT NULL DEFAULT 'QUEUED',
    priority INT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms BIGINT,
    
    error_message TEXT,
    error_details JSONB,
    job_payload JSONB DEFAULT '{}'::jsonb,
    job_metrics JSONB DEFAULT '{}'::jsonb,
    
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_processing_jobs_modtime
BEFORE UPDATE ON processing_jobs
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_processing_jobs_doc_id ON processing_jobs(document_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_type ON processing_jobs(job_type);

-- ============================================================================
-- 6. OCR RESULTS (Raw Multimodal Extractions & Layout Spatial Models)
-- ============================================================================

CREATE TABLE ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_id UUID REFERENCES document_pages(id) ON DELETE CASCADE,
    job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
    
    engine_name VARCHAR(100) NOT NULL,
    raw_extracted_text TEXT NOT NULL,
    structured_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    average_confidence NUMERIC(5, 4) NOT NULL CHECK (average_confidence BETWEEN 0.0000 AND 1.0000),
    character_count INT NOT NULL DEFAULT 0,
    word_count INT NOT NULL DEFAULT 0,
    tables_detected_count INT NOT NULL DEFAULT 0,
    stamps_detected_count INT NOT NULL DEFAULT 0,
    signatures_detected_count INT NOT NULL DEFAULT 0,
    
    processing_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ocr_results_doc_id ON ocr_results(document_id);
CREATE INDEX idx_ocr_results_page_id ON ocr_results(page_id);
CREATE INDEX idx_ocr_results_json_gin ON ocr_results USING GIN(structured_json);

-- ============================================================================
-- 7. LAND RECORDS (Canonical Domain Entities & Legal Parcel Dossiers)
-- ============================================================================

CREATE TABLE land_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    record_unique_identifier VARCHAR(100) NOT NULL UNIQUE, -- E.g. 'LR-MP-SEH-142/1-2026'
    state_portal_reference_id VARCHAR(100),                -- Official e-Dharti / Bhulekh ULPIN
    record_type VARCHAR(100) NOT NULL,                     -- 'Record of Rights (7/12)', 'Khasra Khatauni', 'Porcha Deed'
    
    -- Canonical Cadastral Identifiers
    khasra_number VARCHAR(100) NOT NULL,
    khata_number VARCHAR(100),
    khatauni_number VARCHAR(100),
    survey_number VARCHAR(100),
    plot_number VARCHAR(100),
    
    -- Landholder Personal & Lineage Details
    primary_owner_name VARCHAR(255) NOT NULL,
    owner_name_transliterated VARCHAR(255),
    father_guardian_name VARCHAR(255),
    co_owners_count INT NOT NULL DEFAULT 1,
    co_owners_details JSONB DEFAULT '[]'::jsonb,           -- Array of co-owners and percentage shares
    
    -- Spatial, Geopolitical & Area Dimensions
    state_name VARCHAR(100) NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    tehsil_name VARCHAR(100) NOT NULL,
    revenue_circle_ri VARCHAR(100),
    village_name VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    
    -- Area Quantifications (Standardized & Original Land Metrics)
    total_area_hectares NUMERIC(12, 4) NOT NULL CHECK (total_area_hectares >= 0),
    total_area_acres NUMERIC(12, 4) NOT NULL CHECK (total_area_acres >= 0),
    original_area_value NUMERIC(12, 4) NOT NULL,
    original_area_unit VARCHAR(50) NOT NULL,               -- 'Bigha', 'Guntha', 'Biswa', 'Katha', 'Sq.Ft'
    
    -- Classification & Revenue Assessment
    land_use_classification VARCHAR(100) NOT NULL DEFAULT 'Agricultural', -- 'Commercial', 'Residential', 'Barren'
    soil_classification VARCHAR(100),
    irrigation_source VARCHAR(100),
    land_revenue_tax_inr NUMERIC(10, 2) DEFAULT 0.00,
    
    -- Encumbrance, Dispute & Mutation History
    tenure_type VARCHAR(100) DEFAULT 'Bhumiswami (Freehold)',
    is_disputed BOOLEAN NOT NULL DEFAULT false,
    dispute_details TEXT,
    mutation_number VARCHAR(100),
    mutation_date DATE,
    registration_deed_number VARCHAR(100),
    registration_date DATE,
    
    -- GIS Geometry Vector (GeoJSON Polygon)
    spatial_geojson JSONB DEFAULT '{}'::jsonb,
    
    -- System Confidence & Governance Status
    overall_confidence_score NUMERIC(5, 4) NOT NULL CHECK (overall_confidence_score BETWEEN 0.0000 AND 1.0000),
    is_auto_approved BOOLEAN NOT NULL DEFAULT false,
    verification_status document_status_type NOT NULL DEFAULT 'PENDING_VERIFICATION',
    
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    record_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_land_records_modtime
BEFORE UPDATE ON land_records
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_land_records_doc_id ON land_records(document_id);
CREATE INDEX idx_land_records_khasra ON land_records(khasra_number);
CREATE INDEX idx_land_records_location ON land_records(state_name, district_name, tehsil_name, village_name);
CREATE INDEX idx_land_records_owner_name ON land_records(primary_owner_name);
CREATE INDEX idx_land_records_status ON land_records(verification_status);
CREATE INDEX idx_land_records_confidence ON land_records(overall_confidence_score);
CREATE INDEX idx_land_records_spatial_gin ON land_records USING GIN(spatial_geojson);

-- ============================================================================
-- 8. LAND RECORD FIELDS (Field-Level Confidence, Bounding Boxes & OCR Traceability)
-- ============================================================================

CREATE TABLE land_record_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_id UUID REFERENCES document_pages(id) ON DELETE SET NULL,
    
    field_key VARCHAR(100) NOT NULL,                      -- e.g., 'ownerName', 'khasraNumber', 'plotArea'
    field_label VARCHAR(150) NOT NULL,                    -- e.g., 'Primary Landowner Name'
    field_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',-- 'OWNER', 'PARCEL', 'AREA', 'REVENUE', 'LEGAL'
    
    -- OCR Raw vs. Standardized
    raw_ocr_value TEXT NOT NULL,
    standardized_value TEXT NOT NULL,
    data_type VARCHAR(30) NOT NULL DEFAULT 'STRING',      -- 'STRING', 'NUMERIC', 'DATE', 'GEO_COORDINATE'
    
    -- Confidence Grading
    confidence_score NUMERIC(5, 4) NOT NULL CHECK (confidence_score BETWEEN 0.0000 AND 1.0000),
    confidence_tier confidence_tier_type NOT NULL,
    
    -- Bounding Box Coordinates (Normalized 0.0 to 100.0% of page dimensions)
    bounding_box_x NUMERIC(6, 2) CHECK (bounding_box_x BETWEEN 0 AND 100),
    bounding_box_y NUMERIC(6, 2) CHECK (bounding_box_y BETWEEN 0 AND 100),
    bounding_box_width NUMERIC(6, 2) CHECK (bounding_box_width BETWEEN 0 AND 100),
    bounding_box_height NUMERIC(6, 2) CHECK (bounding_box_height BETWEEN 0 AND 100),
    
    -- Human Verifier Overrides
    is_manually_edited BOOLEAN NOT NULL DEFAULT false,
    original_ai_value TEXT,
    edited_value TEXT,
    edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_land_record_fields_modtime
BEFORE UPDATE ON land_record_fields
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_lr_fields_record_id ON land_record_fields(land_record_id);
CREATE INDEX idx_lr_fields_field_key ON land_record_fields(field_key);
CREATE INDEX idx_lr_fields_confidence_tier ON land_record_fields(confidence_tier);
CREATE INDEX idx_lr_fields_is_edited ON land_record_fields(is_manually_edited);

-- ============================================================================
-- 9. VALIDATION RESULTS (Automated Cadastral & Mathematical Consistency Checks)
-- ============================================================================

CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    job_id UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
    
    rule_code VARCHAR(50) NOT NULL,                       -- e.g., 'VAL-AREA-SUM', 'VAL-KHASRA-FMT', 'VAL-NAME-SCRIPT'
    rule_category VARCHAR(50) NOT NULL,                   -- 'MATHEMATICAL', 'SYNTACTIC', 'LEXICAL', 'CROSS_DOCUMENT'
    rule_name VARCHAR(150) NOT NULL,
    rule_description TEXT,
    
    status validation_status_type NOT NULL,
    severity validation_severity_type NOT NULL DEFAULT 'MEDIUM',
    
    expected_value TEXT,
    actual_value TEXT,
    error_message TEXT,
    resolution_suggestion TEXT,
    is_blocking BOOLEAN NOT NULL DEFAULT false,           -- If true, prevents auto-approval
    
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_val_results_record_id ON validation_results(land_record_id);
CREATE INDEX idx_val_results_status ON validation_results(status);
CREATE INDEX idx_val_results_rule_code ON validation_results(rule_code);

-- ============================================================================
-- 10. VERIFICATION TASKS (Human-In-The-Loop Task Allocation & Workflow Engine)
-- ============================================================================

CREATE TABLE verification_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    land_record_id UUID NOT NULL UNIQUE REFERENCES land_records(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    task_code VARCHAR(100) NOT NULL UNIQUE,               -- E.g. 'TSK-2026-0891'
    priority task_priority_type NOT NULL DEFAULT 'MEDIUM',
    status task_status_type NOT NULL DEFAULT 'UNASSIGNED',
    
    assigned_verifier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    rejection_reason TEXT,
    verifier_notes TEXT,
    resolution_type VARCHAR(50),                          -- 'APPROVED_AS_IS', 'CORRECTED_AND_APPROVED', 'REJECTED_BLURRY'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_verification_tasks_modtime
BEFORE UPDATE ON verification_tasks
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_verif_tasks_status ON verification_tasks(status);
CREATE INDEX idx_verif_tasks_assigned_verifier ON verification_tasks(assigned_verifier_id);
CREATE INDEX idx_verif_tasks_priority ON verification_tasks(priority);

-- ============================================================================
-- 11. AUDIT LOGS (Immutable, Tamper-Evident Government Modification Ledger)
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type audit_action_type NOT NULL,
    entity_name VARCHAR(100) NOT NULL,                    -- 'documents', 'land_records', 'land_record_fields'
    entity_id UUID NOT NULL,
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    action_summary TEXT NOT NULL,
    old_state JSONB,                                      -- Snapshot prior to change
    new_state JSONB,                                      -- Snapshot after change
    diff_payload JSONB,                                   -- Computed delta of modified attributes
    
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_recorded_at ON audit_logs(recorded_at DESC);

-- ============================================================================
-- 12. REPORTING & ANALYTICS VIEWS (Materialized / Standard Views)
-- ============================================================================

-- View: District-Wise Digitization Throughput & SLA Metrics
CREATE OR REPLACE VIEW view_district_digitization_metrics AS
SELECT 
    d.state_name,
    d.district_name,
    COUNT(d.id) AS total_documents_uploaded,
    COUNT(CASE WHEN lr.verification_status = 'VERIFIED_APPROVED' THEN 1 END) AS total_approved,
    COUNT(CASE WHEN lr.is_auto_approved = true THEN 1 END) AS total_auto_approved,
    COUNT(CASE WHEN lr.verification_status = 'PENDING_VERIFICATION' THEN 1 END) AS total_pending_review,
    COUNT(CASE WHEN lr.verification_status = 'REJECTED' THEN 1 END) AS total_rejected,
    ROUND(AVG(lr.overall_confidence_score) * 100, 2) AS average_confidence_percentage,
    ROUND(
        (COUNT(CASE WHEN lr.is_auto_approved = true THEN 1 END)::NUMERIC / NULLIF(COUNT(d.id), 0)) * 100, 2
    ) AS auto_approval_rate_percentage
FROM documents d
LEFT JOIN land_records lr ON d.id = lr.document_id
GROUP BY d.state_name, d.district_name;

-- View: Pending Verification Backlog with Priority Scores
CREATE OR REPLACE VIEW view_active_verification_backlog AS
SELECT 
    vt.id AS task_id,
    vt.task_code,
    vt.priority,
    vt.status AS task_status,
    d.document_unique_code,
    d.original_filename,
    d.primary_language,
    lr.id AS land_record_id,
    lr.primary_owner_name,
    lr.khasra_number,
    lr.district_name,
    lr.overall_confidence_score,
    (
        SELECT COUNT(*) 
        FROM land_record_fields lrf 
        WHERE lrf.land_record_id = lr.id AND lrf.confidence_tier = 'LOW'
    ) AS low_confidence_fields_count,
    (
        SELECT COUNT(*) 
        FROM validation_results vr 
        WHERE vr.land_record_id = lr.id AND vr.status = 'FAIL'
    ) AS validation_failures_count,
    vt.assigned_verifier_id,
    u.full_name AS assigned_verifier_name,
    vt.created_at AS queued_since
FROM verification_tasks vt
JOIN land_records lr ON vt.land_record_id = lr.id
JOIN documents d ON vt.document_id = d.id
LEFT JOIN users u ON vt.assigned_verifier_id = u.id
WHERE vt.status NOT IN ('RESOLVED_APPROVED', 'RESOLVED_REJECTED')
ORDER BY 
    CASE vt.priority
        WHEN 'EXPEDITED' THEN 1
        WHEN 'URGENT' THEN 2
        WHEN 'HIGH' THEN 3
        WHEN 'MEDIUM' THEN 4
        WHEN 'LOW' THEN 5
    END,
    vt.created_at ASC;

-- ============================================================================
-- END OF SCHEMA SPECIFICATION
-- ============================================================================
