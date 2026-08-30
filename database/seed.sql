-- ============================================================================
-- INTELLIGENT LAND RECORD DIGITIZATION & VALIDATION SYSTEM
-- Database Demo Seed Data Script (Fictional Indian Cadastral Datasets)
-- Jurisdiction: DoLR Prototype Demonstration (MP, MH, WB, UP, RJ)
-- ============================================================================

-- Clear existing data in reverse dependency order
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE verification_tasks CASCADE;
TRUNCATE TABLE validation_results CASCADE;
TRUNCATE TABLE land_record_fields CASCADE;
TRUNCATE TABLE land_records CASCADE;
TRUNCATE TABLE ocr_results CASCADE;
TRUNCATE TABLE processing_jobs CASCADE;
TRUNCATE TABLE document_pages CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE user_sessions CASCADE;
TRUNCATE TABLE password_reset_tokens CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE role_permissions CASCADE;
TRUNCATE TABLE permissions CASCADE;
TRUNCATE TABLE roles CASCADE;

-- ----------------------------------------------------------------------------
-- 1. SEED ROLES
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, code, name, description, is_system_role) VALUES
('11111111-1111-1111-1111-111111111101', 'SUPER_ADMIN', 'Super Administrator', 'National / State Technical Director with full governance', true),
('11111111-1111-1111-1111-111111111102', 'ADMIN', 'District Administrator', 'District Collectorate admin managing users, rules and SLAs', true),
('11111111-1111-1111-1111-111111111103', 'DATA_OPERATOR', 'Cadastral Data Operator', 'Scanning vendor and tehsil operator uploading batches', true),
('11111111-1111-1111-1111-111111111104', 'VERIFIER', 'Revenue Verifier / Patwari', 'Revenue Inspector performing side-by-side verification', true),
('11111111-1111-1111-1111-111111111105', 'REVENUE_OFFICER', 'Tehsildar / Sub-Divisional Magistrate', 'Statutory authority executing final legal approval', true),
('11111111-1111-1111-1111-111111111106', 'VIEWER', 'Public / Citizen Viewer', 'Read-only access for citizen search and land search', true),
('11111111-1111-1111-1111-111111111107', 'AUDITOR', 'Statutory Compliance Auditor', 'Independent auditor reviewing tamper-evident ledgers', true);

-- ----------------------------------------------------------------------------
-- 2. SEED PERMISSIONS
-- ----------------------------------------------------------------------------
INSERT INTO permissions (id, code, module, description) VALUES
('22222222-2222-2222-2222-222222222201', 'DOC_UPLOAD', 'DOCUMENT', 'Upload scanned land record deeds and batch files'),
('22222222-2222-2222-2222-222222222202', 'DOC_VIEW', 'DOCUMENT', 'View uploaded documents and page previews'),
('22222222-2222-2222-2222-222222222203', 'DOC_DELETE', 'DOCUMENT', 'Delete erroneous or corrupted document uploads'),
('22222222-2222-2222-2222-222222222204', 'OCR_TRIGGER', 'PIPELINE', 'Trigger Gemini multimodal AI extraction pipeline'),
('22222222-2222-2222-2222-222222222205', 'TASK_CLAIM', 'VERIFICATION', 'Claim queued human verification tasks'),
('22222222-2222-2222-2222-222222222206', 'TASK_SUBMIT', 'VERIFICATION', 'Save field corrections and submit record approval'),
('22222222-2222-2222-2222-222222222207', 'TASK_REJECT', 'VERIFICATION', 'Reject unreadable or fraudulent deed scans'),
('22222222-2222-2222-2222-222222222208', 'AUDIT_INSPECT', 'SECURITY', 'View and export immutable audit logs and diffs'),
('22222222-2222-2222-2222-222222222209', 'USER_MANAGE', 'ADMIN', 'Provision users and manage role assignments'),
('22222222-2222-2222-2222-222222222210', 'ANALYTICS_VIEW', 'ANALYTICS', 'Access district accuracy and throughput dashboards');

-- Role-Permission mappings
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Admin has all permissions
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222203'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222205'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222206'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222207'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222208'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222209'),
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222210'),
-- Data Operator
('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222201'),
('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202'),
('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222204'),
-- Verifier
('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202'),
('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222205'),
('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222206'),
('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207'),
-- Auditor
('11111111-1111-1111-1111-111111111107', '22222222-2222-2222-2222-222222222202'),
('11111111-1111-1111-1111-111111111107', '22222222-2222-2222-2222-222222222208'),
('11111111-1111-1111-1111-111111111107', '22222222-2222-2222-2222-222222222210'),
-- Viewer
('11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222202');

-- ----------------------------------------------------------------------------
-- 3. SEED USERS
-- Standard demo password hash corresponding to bcrypt: '$2b$12$K8yXvL3zN6b1M4n7O2hG7e1zU8vK9lM3nO5pQ7rS9tU1vW3xY5zA.' (demo123)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, role_id, email, password_hash, full_name, employee_id, department, designation, phone_number, is_active) VALUES
('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111102', 'admin.rajesh@landrecords.gov.in', '$2b$12$e8Y7iWJcR6a1N0r7O2hG7e1zU8vK9lM3nO5pQ7rS9tU1vW3xY5zA.', 'Rajesh Sharma', 'EMP-ADM-001', 'Dept of Land Resources', 'Director (IT & Digitization)', '+91-9810012345', true),
('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111104', 'verifier.priya@landrecords.gov.in', '$2b$12$e8Y7iWJcR6a1N0r7O2hG7e1zU8vK9lM3nO5pQ7rS9tU1vW3xY5zA.', 'Priya Verma', 'EMP-REV-104', 'Revenue & Land Reforms', 'Senior Revenue Inspector (Patwari)', '+91-9820023456', true),
('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111103', 'operator.amit@landrecords.gov.in', '$2b$12$e8Y7iWJcR6a1N0r7O2hG7e1zU8vK9lM3nO5pQ7rS9tU1vW3xY5zA.', 'Amit Patel', 'EMP-OPS-215', 'Tehsil Sehore Data Center', 'Lead Digitization Operator', '+91-9830034567', true),
('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111107', 'auditor.sunita@landrecords.gov.in', '$2b$12$e8Y7iWJcR6a1N0r7O2hG7e1zU8vK9lM3nO5pQ7rS9tU1vW3xY5zA.', 'Sunita Rao', 'EMP-AUD-502', 'State Land Audit Cell', 'Chief Vigilance Officer', '+91-9840045678', true),
('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111106', 'citizen.ramesh@gmail.com', '$2b$12$e8Y7iWJcR6a1N0r7O2hG7e1zU8vK9lM3nO5pQ7rS9tU1vW3xY5zA.', 'Ramesh Kumar', 'CITIZEN-091', 'Public User', 'Landowner / Applicant', '+91-9850056789', true);

-- ----------------------------------------------------------------------------
-- 4. SEED DOCUMENTS
-- ----------------------------------------------------------------------------
INSERT INTO documents (
    id, document_unique_code, original_filename, storage_path, file_type, mime_type, 
    file_size_bytes, file_hash_sha256, state_code, state_name, district_name, tehsil_name, 
    village_name, primary_language, script_type, total_pages, status, uploaded_by, raw_document_metadata
) VALUES
(
    '44444444-4444-4444-4444-444444444401',
    'DOC-MP-SEH-2026-001',
    'khasra_panchsala_mp_sehore_142.svg',
    '/storage/documents/2026/08/mp_khasra_142.svg',
    'svg',
    'image/svg+xml',
    248560,
    '8f9b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b',
    'MP',
    'Madhya Pradesh',
    'Sehore',
    'Sehore',
    'Rampur',
    'Hindi',
    'Devanagari',
    1,
    'IN_VERIFICATION',
    '33333333-3333-3333-3333-333333333303',
    '{"scanner_model": "Fujitsu fi-7700", "dpi": 300, "color_depth": "24-bit RGB", "batch_id": "BATCH-2026-08-A"}'::jsonb
),
(
    '44444444-4444-4444-4444-444444444402',
    'DOC-MH-PUN-2026-002',
    'satbara_712_pune_haveli_284.pdf',
    '/storage/documents/2026/08/mh_satbara_284.pdf',
    'pdf',
    'application/pdf',
    1450200,
    '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    'MH',
    'Maharashtra',
    'Pune',
    'Haveli',
    'Wagholi',
    'Marathi',
    'Devanagari',
    2,
    'VERIFIED_APPROVED',
    '33333333-3333-3333-3333-333333333303',
    '{"scanner_model": "Kodak Alaris i3450", "dpi": 400, "batch_id": "BATCH-2026-08-B"}'::jsonb
),
(
    '44444444-4444-4444-4444-444444444403',
    'DOC-WB-NAD-2026-003',
    'ror_porcha_nadia_chakdaha_719.png',
    '/storage/documents/2026/08/wb_porcha_719.png',
    'png',
    'image/png',
    3845000,
    '3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e',
    'WB',
    'West Bengal',
    'Nadia',
    'Chakdaha',
    'Madanpur',
    'Bengali',
    'Eastern Nagari',
    1,
    'PENDING_VERIFICATION',
    '33333333-3333-3333-3333-333333333303',
    '{"scanner_model": "Epson DS-50000", "dpi": 300, "batch_id": "BATCH-2026-08-C"}'::jsonb
);

-- ----------------------------------------------------------------------------
-- 5. SEED DOCUMENT PAGES
-- ----------------------------------------------------------------------------
INSERT INTO document_pages (id, document_id, page_number, page_storage_path, width_pixels, height_pixels, resolution_dpi, rotation_degrees, status) VALUES
('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 1, '/storage/pages/mp_khasra_142_p1.png', 2480, 3508, 300, 0, 'PROCESSED'),
('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402', 1, '/storage/pages/mh_satbara_284_p1.png', 2480, 3508, 400, 0, 'PROCESSED'),
('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444402', 2, '/storage/pages/mh_satbara_284_p2.png', 2480, 3508, 400, 0, 'PROCESSED'),
('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444403', 1, '/storage/pages/wb_porcha_719_p1.png', 2480, 3508, 300, 0, 'PROCESSED');

-- ----------------------------------------------------------------------------
-- 6. SEED PROCESSING JOBS
-- ----------------------------------------------------------------------------
INSERT INTO processing_jobs (
    id, document_id, job_type, engine_name, engine_version, status, priority, 
    attempt_count, started_at, completed_at, execution_time_ms, triggered_by
) VALUES
(
    '66666666-6666-6666-6666-666666666601',
    '44444444-4444-4444-4444-444444444401',
    'MULTIMODAL_OCR',
    'gemini-2.5-flash-multimodal',
    'v2.5.1-cadastral',
    'COMPLETED',
    8,
    1,
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour 59 minutes',
    1480,
    '33333333-3333-3333-3333-333333333303'
),
(
    '66666666-6666-6666-6666-666666666602',
    '44444444-4444-4444-4444-444444444402',
    'MULTIMODAL_OCR',
    'gemini-3.0-pro-multimodal',
    'v3.0.0-cadastral',
    'COMPLETED',
    5,
    1,
    CURRENT_TIMESTAMP - INTERVAL '5 hours',
    CURRENT_TIMESTAMP - INTERVAL '4 hours 58 minutes',
    2150,
    '33333333-3333-3333-3333-333333333303'
),
(
    '66666666-6666-6666-6666-666666666603',
    '44444444-4444-4444-4444-444444444403',
    'MULTIMODAL_OCR',
    'gemini-2.5-flash-multimodal',
    'v2.5.1-cadastral',
    'COMPLETED',
    9,
    1,
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    CURRENT_TIMESTAMP - INTERVAL '28 minutes',
    1820,
    '33333333-3333-3333-3333-333333333303'
);

-- ----------------------------------------------------------------------------
-- 7. SEED OCR RESULTS
-- ----------------------------------------------------------------------------
INSERT INTO ocr_results (
    id, document_id, page_id, job_id, engine_name, raw_extracted_text, structured_json, 
    average_confidence, character_count, word_count, tables_detected_count, stamps_detected_count, signatures_detected_count
) VALUES
(
    '77777777-7777-7777-7777-777777777701',
    '44444444-4444-4444-4444-444444444401',
    '55555555-5555-5555-5555-555555555501',
    '66666666-6666-6666-6666-666666666601',
    'gemini-2.5-flash-multimodal',
    'मध्य प्रदेश शासन - राजस्व विभाग । ग्राम: रामपुर, तहसील: सीहोर, जिला: सीहोर । खसरा क्र.: 142/1, रकबा: 2.450 हे. (6.05 एकड़), खातेदार का नाम: रामेश्वर प्रसाद आत्मज श्यामलाल शर्मा ।',
    '{
        "state": "Madhya Pradesh",
        "district": "Sehore",
        "tehsil": "Sehore",
        "village": "Rampur",
        "khasraNumber": "142/1",
        "khataNumber": "58",
        "ownerName": "रामेश्वर प्रसाद",
        "ownerNameTransliterated": "Rameshwar Prasad",
        "fatherName": "श्यामलाल शर्मा",
        "areaHectares": 2.4500,
        "areaAcres": 6.0540,
        "soilType": "काली दोमट (Black Loamy)",
        "irrigation": "नलकूप (Tube Well)",
        "taxInr": 185.50
    }'::jsonb,
    0.7850,
    420,
    68,
    1,
    1,
    1
),
(
    '77777777-7777-7777-7777-777777777702',
    '44444444-4444-4444-4444-444444444402',
    '55555555-5555-5555-5555-555555555502',
    '66666666-6666-6666-6666-666666666602',
    'gemini-3.0-pro-multimodal',
    'महाराष्ट्र शासन महसूल विभाग - गाव नमुना सातबारा (७/१२). गाव: वाघोली, ता.: हवेली, जि.: पुणे. गट क्र.: २८४, क्षेत्र: १.२० हे.आर., खातेदार: विठ्ठल तुकाराम जगताप.',
    '{
        "state": "Maharashtra",
        "district": "Pune",
        "tehsil": "Haveli",
        "village": "Wagholi",
        "surveyNumber": "284",
        "khataNumber": "112",
        "ownerName": "विठ्ठल तुकाराम जगताप",
        "ownerNameTransliterated": "Vitthal Tukaram Jagtap",
        "areaHectares": 1.2000,
        "areaAcres": 2.9650
    }'::jsonb,
    0.9420,
    580,
    94,
    2,
    2,
    2
);

-- ----------------------------------------------------------------------------
-- 8. SEED LAND RECORDS
-- ----------------------------------------------------------------------------
INSERT INTO land_records (
    id, document_id, record_unique_identifier, state_portal_reference_id, record_type, 
    khasra_number, khata_number, survey_number, primary_owner_name, owner_name_transliterated, 
    father_guardian_name, state_name, district_name, tehsil_name, village_name, 
    total_area_hectares, total_area_acres, original_area_value, original_area_unit, 
    land_use_classification, soil_classification, irrigation_source, land_revenue_tax_inr, 
    overall_confidence_score, is_auto_approved, verification_status, spatial_geojson
) VALUES
(
    '88888888-8888-8888-8888-888888888801',
    '44444444-4444-4444-4444-444444444401',
    'LR-MP-SEH-142/1-2026',
    'ULPIN-23-4589-1048-2891',
    'Khasra Khatauni Panchsala',
    '142/1',
    '58',
    '142',
    'रामेश्वर प्रसाद',
    'Rameshwar Prasad',
    'श्यामलाल शर्मा (Shyamlal Sharma)',
    'Madhya Pradesh',
    'Sehore',
    'Sehore',
    'Rampur',
    2.4500,
    6.0540,
    4.9000,
    'Bigha',
    'Irrigated Multi-Crop Agriculture',
    'Black Cotton / Loam',
    'Canal & Private Tube Well',
    185.50,
    0.7850,
    false,
    'IN_VERIFICATION',
    '{
        "type": "Feature",
        "properties": {"khasra": "142/1", "village": "Rampur"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[77.0851, 23.1982], [77.0875, 23.1985], [77.0872, 23.1958], [77.0848, 23.1955], [77.0851, 23.1982]]]
        }
    }'::jsonb
),
(
    '88888888-8888-8888-8888-888888888802',
    '44444444-4444-4444-4444-444444444402',
    'LR-MH-PUN-284-2026',
    'ULPIN-27-8912-4019-9942',
    'Record of Rights (7/12 Satbara)',
    '284',
    '112',
    '284',
    'विठ्ठल तुकाराम जगताप',
    'Vitthal Tukaram Jagtap',
    'तुकाराम जगताप (Tukaram Jagtap)',
    'Maharashtra',
    'Pune',
    'Haveli',
    'Wagholi',
    1.2000,
    2.9650,
    1.2000,
    'Hectares',
    'Agricultural / Semi-Urban',
    'Medium Black',
    'Well Irrigation',
    240.00,
    0.9420,
    true,
    'VERIFIED_APPROVED',
    '{
        "type": "Feature",
        "properties": {"gat_no": "284", "village": "Wagholi"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[73.9851, 18.5782], [73.9875, 18.5785], [73.9872, 18.5758], [73.9848, 18.5755], [73.9851, 18.5782]]]
        }
    }'::jsonb
);

-- ----------------------------------------------------------------------------
-- 9. SEED LAND RECORD FIELDS (Traceability & Bounding Boxes)
-- ----------------------------------------------------------------------------
INSERT INTO land_record_fields (
    id, land_record_id, document_id, page_id, field_key, field_label, field_category, 
    raw_ocr_value, standardized_value, data_type, confidence_score, confidence_tier, 
    bounding_box_x, bounding_box_y, bounding_box_width, bounding_box_height, is_manually_edited
) VALUES
(
    '99999999-9999-9999-9999-999999999901',
    '88888888-8888-8888-8888-888888888801',
    '44444444-4444-4444-4444-444444444401',
    '55555555-5555-5555-5555-555555555501',
    'ownerName',
    'Primary Landowner Name',
    'OWNER',
    'रामेश्वर प्रसाद',
    'Rameshwar Prasad',
    'STRING',
    0.7200,
    'MEDIUM',
    15.50,
    22.40,
    35.00,
    4.50,
    false
),
(
    '99999999-9999-9999-9999-999999999902',
    '88888888-8888-8888-8888-888888888801',
    '44444444-4444-4444-4444-444444444401',
    '55555555-5555-5555-5555-555555555501',
    'khasraNumber',
    'Khasra / Survey Number',
    'PARCEL',
    '142/1',
    '142/1',
    'STRING',
    0.9100,
    'HIGH',
    52.00,
    22.40,
    18.50,
    4.50,
    false
),
(
    '99999999-9999-9999-9999-999999999903',
    '88888888-8888-8888-8888-888888888801',
    '44444444-4444-4444-4444-444444444401',
    '55555555-5555-5555-5555-555555555501',
    'plotAreaHectares',
    'Cadastral Plot Area (Hectares)',
    'AREA',
    '2.450',
    '2.4500',
    'NUMERIC',
    0.5400, -- Low confidence triggering review
    'LOW',
    72.00,
    22.40,
    15.00,
    4.50,
    false
),
(
    '99999999-9999-9999-9999-999999999904',
    '88888888-8888-8888-8888-888888888801',
    '44444444-4444-4444-4444-444444444401',
    '55555555-5555-5555-5555-555555555501',
    'fatherName',
    'Father / Guardian Lineage Name',
    'OWNER',
    'श्यामलाल शर्मा',
    'Shyamlal Sharma',
    'STRING',
    0.8800,
    'HIGH',
    15.50,
    28.00,
    35.00,
    4.50,
    false
);

-- ----------------------------------------------------------------------------
-- 10. SEED VALIDATION RESULTS
-- ----------------------------------------------------------------------------
INSERT INTO validation_results (
    id, land_record_id, job_id, rule_code, rule_category, rule_name, rule_description, 
    status, severity, expected_value, actual_value, error_message, resolution_suggestion, is_blocking
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '88888888-8888-8888-8888-888888888801',
    '66666666-6666-6666-6666-666666666601',
    'VAL-AREA-SUM',
    'MATHEMATICAL',
    'Sub-Plot Area Summation Integrity',
    'Verifies that individual agricultural sub-plots sum exactly to total parcel size',
    'PASS',
    'LOW',
    '2.4500 Ha',
    '2.4500 Ha',
    NULL,
    'Area calculation matches record header.',
    false
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '88888888-8888-8888-8888-888888888801',
    '66666666-6666-6666-6666-666666666601',
    'VAL-CONF-THRESH',
    'LEXICAL',
    'Minimum OCR Confidence Threshold Check',
    'Checks if all critical legal identifiers meet the >= 85% confidence baseline',
    'WARNING',
    'HIGH',
    '>= 0.8500',
    '0.5400',
    'Plot area numeral was faded on original scan and scored 54% confidence.',
    'Inspect document canvas left viewport and verify decimal placement.',
    true
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '88888888-8888-8888-8888-888888888801',
    '66666666-6666-6666-6666-666666666601',
    'VAL-SEAL-SIGN',
    'SYNTACTIC',
    'Official Tehsildar Seal & Digital Stamp Verification',
    'Verifies presence of government emblem seal and registrar signature',
    'PASS',
    'INFO',
    'Seal Detected',
    'Tehsildar Sehore Circular Seal Detected (Confidence 96%)',
    NULL,
    'Document authenticity marker valid.',
    false
);

-- ----------------------------------------------------------------------------
-- 11. SEED VERIFICATION TASKS
-- ----------------------------------------------------------------------------
INSERT INTO verification_tasks (
    id, land_record_id, document_id, task_code, priority, status, 
    assigned_verifier_id, assigned_at, claimed_at, due_date, verifier_notes
) VALUES
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '88888888-8888-8888-8888-888888888801',
    '44444444-4444-4444-4444-444444444401',
    'TSK-MP-2026-00891',
    'HIGH',
    'IN_PROGRESS',
    '33333333-3333-3333-3333-333333333302', -- Assigned to Priya Verma
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP + INTERVAL '24 hours',
    'Currently verifying faded area decimals on Column 4 of MP Khasra table.'
);

-- ----------------------------------------------------------------------------
-- 12. SEED AUDIT LOGS
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (
    id, event_type, entity_name, entity_id, user_id, user_role, ip_address, 
    user_agent, action_summary, old_state, new_state, recorded_at
) VALUES
(
    'cccccccc-cccc-cccc-cccc-cccccccccc01',
    'DOCUMENT_UPLOAD',
    'documents',
    '44444444-4444-4444-4444-444444444401',
    '33333333-3333-3333-3333-333333333303',
    'DATA_OPERATOR',
    '10.20.45.102',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0',
    'Uploaded scanned cadastral deed khasra_panchsala_mp_sehore_142.svg for Sehore district',
    NULL,
    '{"document_code": "DOC-MP-SEH-2026-001", "size_kb": 248, "status": "UPLOADED"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccc02',
    'OCR_COMPLETED',
    'ocr_results',
    '77777777-7777-7777-7777-777777777701',
    '33333333-3333-3333-3333-333333333303',
    'DATA_OPERATOR',
    '127.0.0.1',
    'GeminiMultimodalPipeline/2.5',
    'Extracted 12 cadastral fields via Gemini 2.5 Flash; Overall confidence 78.50%',
    NULL,
    '{"fields_extracted": 12, "low_confidence_fields": ["plotAreaHectares"]}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 hour 58 minutes'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccc03',
    'TASK_CLAIMED',
    'verification_tasks',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '33333333-3333-3333-3333-333333333302',
    'VERIFIER',
    '10.20.45.188',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0',
    'Verifier Priya Verma claimed task TSK-MP-2026-00891 for side-by-side inspection',
    '{"status": "UNASSIGNED"}'::jsonb,
    '{"status": "IN_PROGRESS", "verifier": "Priya Verma"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '45 minutes'
);

-- ============================================================================
-- END OF SEED SCRIPT
-- ============================================================================
