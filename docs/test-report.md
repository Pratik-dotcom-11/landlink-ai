# Quality Assurance Test Report

## 1. Authentication & RBAC

| Test Case | Status | Root Cause | Fix Applied |
| :--- | :--- | :--- | :--- |
| **Happy Path:** Login with valid credentials (ADMIN) | ✅ PASS | - | - |
| **Failure Path:** Login with invalid credentials | ✅ PASS | - | - |
| **Failure Path:** Missing JWT / Invalid JWT | ✅ FIXED | `authenticateToken` middleware was defaulting to a hardcoded Data Operator user (failing open) for seamless preview. | Modified `authenticateToken` to strictly verify the JWT and return `401 Unauthorized` if invalid or missing. Applied to all relevant API endpoints. |
| **Failure Path:** Unauthorized RBAC access (Operator accessing Admin endpoints) | ✅ FIXED | Role checks were missing on administrative endpoints (e.g., `/api/auth/users`, `/api/audit-logs`, `/api/config/rules`). | Created and applied a `requireRole` middleware to enforce RBAC constraints based on the decoded JWT user role. |

## 2. Document Upload & Processing (OCR / AI Extraction)

| Test Case | Status | Root Cause | Fix Applied |
| :--- | :--- | :--- | :--- |
| **Happy Path:** Upload valid document | ✅ PASS | - | - |
| **Failure Path:** Missing filename or file data | ✅ PASS | - | - |
| **Failure Path:** Unsupported file type | ✅ PASS | - | - |
| **Failure Path:** OCR Failure / Backend AI Unavailable | ✅ PASS | Gemini API failure or network timeout. | The backend gracefully falls back to a deterministic heuristic parser (`fallbackExtraction`) to ensure the user can still proceed with verification without blocking the workflow. |

## 3. Validation Engine & Confidence Scoring

| Test Case | Status | Root Cause | Fix Applied |
| :--- | :--- | :--- | :--- |
| **Happy Path:** Validation rules execute and calculate scores | ✅ PASS | - | - |
| **Failure Path:** Missing fields or low confidence scores | ✅ PASS | Simulated poor scan quality. | The extraction pipeline correctly tags confidence `< 0.60` as `LOW` and highlights them in the Human Verification UI with high-contrast rose borders. |
| **Failure Path:** Duplicate record detection | ✅ PASS | Simulated duplicate registration numbers. | The `runValidationEngine` flags `REG-001` (Duplicate Registration) if another record with the same registration exists. |

## 4. Human Verification & Dashboard

| Test Case | Status | Root Cause | Fix Applied |
| :--- | :--- | :--- | :--- |
| **Happy Path:** Verify and approve record | ✅ PASS | - | - |
| **Happy Path:** Reject record | ✅ PASS | - | - |
| **Happy Path:** Search for existing records | ✅ PASS | - | - |

## Summary
- Testing identified critical security vulnerabilities in the authentication middleware where the system would fail-open to allow preview access.
- RBAC controls were successfully implemented and tested.
- The UI handles all states correctly without crashing, and fallback routines for AI extraction ensure high availability.
