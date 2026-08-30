# System Architecture Specification: Intelligent Land Record Digitization & Validation System

**Project:** Intelligent Land Record Digitization, Validation, and Verification Platform  
**Target Organization:** Department of Land Resources (DoLR), Government of India / State Revenue Departments  
**Target Scope:** First-Year BTech Hackathon Prototype & Production Blueprint  
**Architecture Style:** Clean Monolithic Full-Stack (Single Repository, React + Node.js/Express, Server-Side AI Engine)

---

## 1. System Architecture

The system is designed as a **Modular Monolith** to balance rapid hackathon implementation with high reliability and zero distributed system complexity. It avoids multi-service network overhead and Kubernetes orchestration in favor of a single full-stack runtime with distinct, cleanly decoupled software layers.

```
+-----------------------------------------------------------------------------------+
|                                CLIENT LAYER (SPA)                                 |
|  - React 18 + TypeScript + Vite + Tailwind CSS                                    |
|  - Role-Adaptive Dashboard Views (Admin, Operator, Verifier, Public Viewer)      |
|  - Interactive Document Annotation & Side-by-Side Verification Workspace          |
|  - Spatial GIS Cadastral Boundary Visualizer (Leaflet / Canvas)                   |
+-----------------------------------------------------------------------------------+
                                         │  ▲ (REST / JSON over HTTPS)
                                         ▼  │
+-----------------------------------------------------------------------------------+
|                           APPLICATION SERVER (EXPRESS)                            |
|                                                                                   |
|  [ Auth & RBAC Middleware ]  ──> JWT / Bearer Token & Role Enforcer               |
|  [ Ingestion Controller ]    ──> Multi-format uploads (PDF, TIFF, PNG, JPEG)       |
|  [ OCR & AI Engine ]         ──> Gemini 2.5/3.0 Multimodal Pipeline                |
|  [ Cross-Validation Engine ] ──> Mathematical, Lexical & Cadastral Consistency   |
|  [ Verification Workflow ]   ──> Task Queuing, Human-in-the-Loop & Audit Trails   |
|  [ Spatial / GIS Subsystem ] ──> Bounding Box & Geo-Coordinate Resolution         |
|  [ Analytics Engine ]        ──> District accuracy, throughput & SLA statistics  |
+-----------------------------------------------------------------------------------+
                                         │  ▲
                                         ▼  │
+-----------------------------------------------------------------------------------+
|                               PERSISTENCE & STORAGE                               |
|  - Structured Datastore (PostgreSQL / SQLite / In-Memory JSON DB for Prototype)  |
|  - Raw Binary & Processed Blob Storage (Local FS / S3 Bucket / Base64 Payloads)   |
|  - Immutable Audit & Revision Log Ledger                                          |
+-----------------------------------------------------------------------------------+
```

### Architectural Principles:
1. **Single Runtime Simplicity:** Backend services and Vite client are served from a single port/container without microservice fragmentation.
2. **Server-Side AI Secrets:** LLM and OCR API keys never touch the client browser.
3. **Human-in-the-Loop (HITL) by Design:** AI never writes directly to canonical status without passing automated validation thresholds (>85% confidence + rule clearance) or manual operator review.
4. **Idempotency & Resiliency:** All ingestion and extraction routines can be safely re-run without duplicating land parcels or corruption.

---

## 2. Folder Structure

A standardized, scalable directory layout separating presentation, business logic, persistence, and documentation.

```text
/
├── docs/
│   ├── architecture.md           # This document
│   ├── requirements.md           # Functional & non-functional requirements
│   └── api-spec.md               # OpenAPI / REST endpoint specifications
├── public/
│   ├── sample-data/
│   │   ├── documents/            # Sample 7/12, Porcha, Khasra, Deeds (SVG/PDF/PNG)
│   │   └── gis/                  # Sample cadastral shapefiles / GeoJSON
│   └── favicon.ico
├── server/
│   ├── controllers/              # Request handlers (auth, records, ocr, verification)
│   ├── middleware/               # Auth, role check, upload multer, error handling
│   ├── services/
│   │   ├── gemini.ts             # Gemini Multimodal OCR & Field Extractor
│   │   ├── validationEngine.ts   # Cadastral cross-check & math verification rules
│   │   ├── spatialService.ts     # GeoJSON & coordinate normalization
│   │   └── auditService.ts       # Tamper-evident logging service
│   ├── db.ts                     # Database connection, schemas, and seed data
│   └── types.ts                  # Backend domain types
├── src/
│   ├── assets/                   # Logos, static icons, emblems
│   ├── components/               # Reusable UI components
│   │   ├── DocumentViewer.tsx    # Zoom, rotate, bbox highlight & canvas inspection
│   │   ├── ConfidenceBadge.tsx   # Color-coded metric badges (High/Med/Low)
│   │   ├── StatusBadge.tsx       # State flow badges (Pending, Verified, Rejected)
│   │   ├── CadastralMap.tsx      # GIS parcel plot overlay
│   │   ├── Header.tsx            # Navigation and user profile bar
│   │   └── Sidebar.tsx           # Role-based sidebar menu
│   ├── context/
│   │   └── AuthContext.tsx       # Auth token, active user, role switching
│   ├── services/
│   │   └── api.ts                # Axios/Fetch API client wrapper
│   ├── views/                    # Top-level screen views
│   │   ├── DashboardView.tsx     # KPI metrics, throughput & accuracy gauges
│   │   ├── UploadDocumentView.tsx# Batch dropzone & pipeline runner
│   │   ├── DocumentsListView.tsx # Cadastral document repository
│   │   ├── HumanVerificationView.tsx # Side-by-side split screen review workspace
│   │   ├── RecordDetailModal.tsx # Full parcel dossier and mutation history
│   │   ├── AnalyticsView.tsx     # SLA and confidence distribution reports
│   │   └── UserManagementView.tsx# RBAC user provisioning
│   ├── types.ts                  # Client TypeScript interfaces
│   ├── App.tsx                   # Main routing & layout controller
│   ├── index.css                 # Tailwind CSS directives
│   └── main.tsx                  # React DOM entry point
├── server.ts                     # Main Express server entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Database ER Design

The datastore model centers on 6 core entities ensuring relational integrity between raw documents, parsed records, field-level confidences, validation findings, verification tasks, and audit trails.

```
       +---------------+              1:N             +--------------------+
       |     Users     |----------------------------< | VerificationTasks  |
       +---------------+                              +--------------------+
               | 1:N                                             |
               |                                                 | 1:1
               v                                                 v
       +---------------+              1:1             +--------------------+
       |   Documents   |----------------------------> |    LandRecords     |
       +---------------+                              +--------------------+
               |                                                 |
               | 1:N                                      1:N    |    1:N
               v                                      +----------+----------+
       +---------------+                              v                     v
       |  AuditTrails  |                    +------------------+  +-------------------+
       +---------------+                    | ExtractedFields  |  | ValidationResults |
                                            +------------------+  +-------------------+
```

### Table Schemas

#### 1. `users`
- `id` (UUID/String, PK)
- `name` (VARCHAR)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `role` (ENUM: `ADMIN`, `DATA_OPERATOR`, `VERIFIER`, `VIEWER`)
- `department` (VARCHAR: e.g. "Revenue & Land Reforms")
- `designation` (VARCHAR)
- `created_at` (TIMESTAMP)

#### 2. `documents`
- `id` (UUID/String, PK)
- `filename` (VARCHAR)
- `file_type` (VARCHAR: `pdf`, `png`, `jpg`, `svg`)
- `file_path_or_url` (TEXT)
- `file_size_bytes` (INTEGER)
- `language` (VARCHAR: e.g. "Hindi", "Bengali", "Marathi", "English")
- `status` (ENUM: `UPLOADED`, `PROCESSING`, `VALIDATED`, `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`)
- `uploaded_by` (FK -> `users.id`)
- `uploaded_at` (TIMESTAMP)

#### 3. `land_records`
- `id` (UUID/String, PK)
- `document_id` (FK -> `documents.id`, UNIQUE)
- `owner_name` (VARCHAR)
- `owner_name_transliterated` (VARCHAR)
- `father_guardian_name` (VARCHAR)
- `survey_number` (VARCHAR)
- `khasra_number` (VARCHAR)
- `khata_number` (VARCHAR)
- `plot_number` (VARCHAR)
- `plot_area` (FLOAT)
- `plot_area_unit` (ENUM: `Acres`, `Hectares`, `Bigha`, `Guntha`, `Sq.Ft`)
- `village` (VARCHAR)
- `tehsil` (VARCHAR)
- `district` (VARCHAR)
- `state` (VARCHAR)
- `land_classification` (VARCHAR)
- `ownership_type` (VARCHAR)
- `mutation_details` (TEXT)
- `registration_number` (VARCHAR)
- `registration_date` (DATE)
- `overall_confidence` (FLOAT: 0.00 - 1.00)
- `status` (ENUM: `AUTO_APPROVED`, `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 4. `extracted_fields`
- `id` (UUID/String, PK)
- `record_id` (FK -> `land_records.id`)
- `field_key` (VARCHAR: e.g. "ownerName", "khasraNumber")
- `label` (VARCHAR: e.g. "Landowner Name")
- `raw_ocr_value` (TEXT)
- `standardized_value` (TEXT)
- `confidence_score` (FLOAT: 0.00 - 1.00)
- `confidence_tier` (ENUM: `HIGH`, `MEDIUM`, `LOW`)
- `bounding_box` (JSON: `{ x, y, width, height, page }`)
- `is_corrected` (BOOLEAN)
- `corrected_value` (TEXT)
- `corrected_by` (FK -> `users.id`, NULLABLE)

#### 5. `validation_results`
- `id` (UUID/String, PK)
- `record_id` (FK -> `land_records.id`)
- `rule_code` (VARCHAR: e.g. "VAL-AREA-SUM", "VAL-KHASRA-FMT", "VAL-NAME-LANG")
- `rule_name` (VARCHAR)
- `status` (ENUM: `PASS`, `FAIL`, `WARNING`)
- `severity` (ENUM: `LOW`, `MEDIUM`, `HIGH`)
- `error_message` (TEXT)
- `executed_at` (TIMESTAMP)

#### 6. `verification_tasks`
- `id` (UUID/String, PK)
- `record_id` (FK -> `land_records.id`, UNIQUE)
- `document_id` (FK -> `documents.id`)
- `assigned_to` (FK -> `users.id`, NULLABLE)
- `status` (ENUM: `PENDING`, `IN_REVIEW`, `VERIFIED`, `REJECTED`)
- `priority` (ENUM: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
- `rejection_reason` (TEXT, NULLABLE)
- `assigned_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, NULLABLE)

#### 7. `audit_trails`
- `id` (UUID/String, PK)
- `record_id` (FK -> `land_records.id`)
- `user_id` (FK -> `users.id`)
- `action` (VARCHAR: `UPLOAD`, `AI_EXTRACT`, `AUTO_VALIDATE`, `MANUAL_CORRECT`, `APPROVE`, `REJECT`)
- `field_modified` (VARCHAR, NULLABLE)
- `previous_value` (TEXT, NULLABLE)
- `new_value` (TEXT, NULLABLE)
- `ip_address` (VARCHAR)
- `timestamp` (TIMESTAMP)

---

## 4. API Architecture

All endpoints follow REST conventions, with JSON payloads, standard HTTP status codes, and `Authorization: Bearer <token>` protection.

### Authentication & User Endpoints
- `POST /api/auth/login` — Authenticate user and return JWT + Profile
- `POST /api/auth/logout` — Invalidate session
- `GET /api/auth/me` — Return current authenticated session details
- `GET /api/users` — List operators and verifiers (Admin only)
- `POST /api/users` — Create user (Admin only)

### Document Ingestion & Retrieval
- `POST /api/documents/upload` — Multipart/JSON document upload (supports PDF, PNG, JPG, TIFF, SVG)
- `GET /api/documents` — Query documents (with pagination, status, and language filters)
- `GET /api/documents/:id` — Get document metadata and extraction link
- `GET /api/documents/:id/raw` — Serve binary or streamable PDF/Image for canvas viewer

### AI OCR & Extraction Pipeline
- `POST /api/documents/:id/process` — Trigger OCR extraction & validation for a document
- `POST /api/documents/batch-process` — Run batch digitization on multiple queued documents
- `GET /api/records` — Search digitized land records with filters (district, state, owner)
- `GET /api/records/:id` — Retrieve comprehensive record dossier (fields, BBoxes, validation)

### Human Verification Workflow
- `GET /api/verification/tasks` — List queued HITL verification tasks (filterable by priority/status)
- `GET /api/verification/tasks/:id` — Retrieve task workspace payload
- `POST /api/verification/tasks/:id/claim` — Assign/lock task to currently logged-in verifier
- `POST /api/verification/records/:id/save-draft` — Save interim field corrections without final signoff
- `POST /api/verification/records/:id/submit` — Final approval with updated field mappings
- `POST /api/verification/records/:id/reject` — Mark record as rejected with mandatory audit reason

### Analytics & System Metrics
- `GET /api/analytics/summary` — Aggregate KPIs: total digitized, auto-approved %, manual verification rate, avg turnaround time
- `GET /api/analytics/accuracy-by-language` — Regional script OCR precision breakdown
- `GET /api/analytics/audit-log` — Paginated tamper-evident modification ledger

---

## 5. OCR & AI Processing Architecture

The AI subsystem handles low-quality scans, regional Indic languages (Hindi Devanagari, Bengali, Marathi, Gujarati, Telugu, Tamil), complex tabular structures, and official rubber stamps.

```
+------------------------------------------------------------------------------------+
|                         OCR & AI PIPELINE WORKFLOW                                 |
+------------------------------------------------------------------------------------+
                                         │
                                [1. PREPROCESSING]
                                         │
        - Format standardization (PDF rasterization, SVG parse, TIFF conversion)
        - Contrast enhancement & basic de-skewing
                                         │
                                         ▼
                             [2. MULTIMODAL INFERENCE]
                                         │
        - Payload dispatch to Gemini 2.5/3.0 Multimodal API (Server-side)
        - Structured Prompting with Domain-Specific Cadastral Lexicon:
          * Khasra / Khatauni / 7-12 / Porcha schema definitions
          * Multilingual extraction with Latin Transliteration
          * Bounding Box coordinates (x, y, width, height) normalized 0-100%
                                         │
                                         ▼
                            [3. JSON SCHEMA ENFORCEMENT]
                                         │
        - Strict JSON response schema parsing
        - Fallback heuristic extraction if JSON formatting faults
                                         │
                                         ▼
                          [4. CONFIDENCE SCORING ENGINE]
                                         │
        - Token-level log-probability evaluation & character ambiguity check
        - Field-by-field classification:
          * HIGH (>= 85%): Crisp machine print, standard format
          * MEDIUM (60% - 84%): Minor degradation, unusual abbreviations
          * LOW (< 60%): Hand-written marginal notes, smudged seals, folds
                                         │
                                         ▼
                         [5. AUTOMATED VALIDATION ENGINE]
                                         │
        - Rule 1: Plot Area Summation (Sum of sub-plots == Total Khasra Area)
        - Rule 2: Khasra Format Check (e.g., Numeric with valid sub-plot notation '184/2')
        - Rule 3: Cross-Language Alignment (Native name matches Latin transliteration)
        - Rule 4: Stamp & Seal Presence (Tehsildar / Registrar signature detected)
                                         │
                                         ▼
                                [6. ROUTING DECISION]
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             │ (All Rules Pass & Confidence >= 85%)                  │ (Any Rule Fails OR Confidence < 85%)
             ▼                                                       ▼
      [AUTO-APPROVED]                                     [PENDING VERIFICATION]
      (Instant Record Indexing)                           (Routed to HITL Verifier Queue)
```

---

## 6. Authentication & RBAC Architecture

A role-based access control matrix tailored to revenue department hierarchies:

| Role | Permissions & Scope | Typical Persona |
| :--- | :--- | :--- |
| **`ADMIN`** | System config, user provisioning, global analytics, audit log inspection, rule threshold tweaking | District Collector, DoLR Technical Director |
| **`DATA_OPERATOR`**| Batch document upload, scan quality inspection, triggering re-runs, viewing own uploads | Scanning Vendor, Tehsil Data Entry Operator |
| **`VERIFIER`** | Reviewing low-confidence records, side-by-side editing, approve/reject land deeds, draft saves | Revenue Inspector (RI), Patwari, Tehsildar |
| **`VIEWER`** | Read-only search on verified records, GIS plot viewing, certificate download | Citizen, Bank Officer, Legal Auditor |

### Security Mechanisms:
- **Stateless JWT Tokens** with 8-hour expiration and cryptographic HMAC-SHA256 signature.
- **Role Guard Middleware**: Backend routes evaluate `req.user.role` prior to executing privileged business logic.
- **Audit Logging**: Any write or edit to a land field captures `userId`, `timestamp`, `oldValue`, and `newValue`.

---

## 7. Frontend Page Structure & Navigation

The user interface provides dedicated views optimized for high-throughput government workflows:

```
[ Top Header: DoLR Emblem | Search Bar | Active Role Switcher | User Profile ]
─────────────────────────────────────────────────────────────────────────────
[ Left Sidebar ] │ [ Main Active Content Viewport ]
                 │
 1. Overview     │  - Real-time Digitization Progress Counters & Error Rate
 2. Ingestion    │  - Multi-file Drag & Drop Area, Script Selector & Live Preview
 3. Repository   │  - Filterable Table of all scanned deeds with status chips
 4. Verification │  - SPLIT-SCREEN WORKSPACE:
                 │    * Left Pane: Scanned Document Viewer (Zoom, Rotate, BBox focus)
                 │    * Right Pane: Editable Fields, Confidence Badges, Diff Highlights
 5. GIS Cadastre │  - Spatial map showing parcel polygons and adjoining khasras
 6. Analytics    │  - Language accuracy graphs, operator throughput, SLA bottleneck charts
 7. Audit Log    │  - Immutable log table tracking every verification action
 8. Admin / RBAC │  - User management and role assignment
```

---

## 8. Data Flow

### End-to-End Processing Lifecycle:
1. **Upload & Ingestion:** Data Operator uploads a scanned batch. Backend validates MIME type, saves raw asset, and creates a `documents` record in `UPLOADED` state.
2. **AI Inference:** Backend calls Gemini Multimodal API with targeted extraction prompt. Response yields structured JSON with fields, bounding boxes, and confidence levels.
3. **Cross-Validation Execution:** `validationEngine.ts` executes mathematical and semantic checks on the parsed data.
4. **Triage & Routing:**
   - If confidence $\ge 85\%$ and 0 validation errors $\rightarrow$ status becomes `AUTO_APPROVED`.
   - If confidence $< 85\%$ or validation errors $\rightarrow$ status becomes `PENDING_VERIFICATION`, and a task is enqueued.
5. **Human Review:** Verifier claims the task, examines low-confidence fields highlighted over the canvas, corrects discrepancies, and submits approval.
6. **Persistence & Auditing:** The finalized record is stored in `land_records`, and a tamper-evident entry is logged in `audit_trails`.

---

## 9. Integration Strategy

The system is designed for modular pluggability with existing government platforms:

1. **Digital India Land Records Modernization Programme (DILRMP) / Bhulekh:**
   - REST and CSV export format matching state Bhulekh portal APIs (e.g. MahaBhulekh, BanglarBhumi, MP Bhulekh).
2. **e-Courts & Land Dispute Databases:**
   - Optional validation hook verifying that the Khasra number is not currently flagged for civil injunction or stay orders.
3. **Survey of India (SoI) / SWAMITVA Drone GIS:**
   - Ingestion of GeoJSON spatial vectors to match physical drone boundary coordinates with deed textual areas.

---

## 10. Development Phases

A structured 4-phase hackathon implementation plan:

```
+──────────────────────────+──────────────────────────+──────────────────────────+──────────────────────────+
|         PHASE 1          |         PHASE 2          |         PHASE 3          |         PHASE 4          |
|    Core Foundation       |    AI & OCR Pipeline     |  HITL Verification UI    |  Analytics & Polish      |
|         (Day 1)          |        (Day 1-2)         |         (Day 2)          |        (Day 2-3)         |
+──────────────────────────+──────────────────────────+──────────────────────────+──────────────────────────+
| • DB schema setup        | • Gemini OCR prompt      | • Split-screen UI        | • Analytics charts       |
| • Express API setup      | • Confidence engine      | • Zoom/rotate canvas     | • Audit log viewer       |
| • Auth & RBAC context    | • Validation rules       | • Field diff & save      | • Sample data & tests    |
| • Base layout & sidebar  | • Auto-routing logic     | • Rejection flow         | • Final presentation doc |
+──────────────────────────+──────────────────────────+──────────────────────────+──────────────────────────+
```

---

## 11. Technical Risk Assessment & Mitigation

| Potential Technical Risk | Impact | Likelihood | Concrete Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Poor Scan Quality / Faded Ink** | High | High | Pre-processing contrast enhancement; highlight low-confidence fields in red/amber; direct routing to HITL review. |
| **Multilingual Script OCR Errors** | High | Medium | Domain-specific prompt conditioning with transliterated ground truth; Indic font support in UI. |
| **LLM Rate Limits / API Outages** | Medium | Medium | In-memory queue with exponential backoff; fallback mock engine for testing and demo reliability. |
| **Spatial / Area Unit Discrepancies** | Medium | High | Standardized Unit Converter (Bigha/Guntha $\rightarrow$ Standard Hectares/Acres) embedded in the validation engine. |
| **Complex Frontend State in Split-Screen** | Medium | Low | Centralized record state with dirty-checking and automatic draft save before unmounting. |

---

## Architectural Sign-Off & Status

- **Status:** **PROPOSED & SPECIFIED** (Awaiting user review and approval)
- **Feasibility:** Fully compatible with React 18, Vite, Express, TypeScript, and Google Gemini Multimodal APIs.
