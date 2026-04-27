# Bulk Monitoring (Pemantauan) Feature

## TL;DR

> **Quick Summary**: Add "Pemantauan" mode to existing bulk risk page. Users select mode (Risiko Baru / Pemantauan), pick a cycle, upload a monitoring template matching "KK Pemantauan Reviu" format, preview parsed data with server-computed scores, then submit to create reassessment drafts for approved risks.
>
> **Deliverables**:
> - Backend: `BulkMonitoringSpreadsheetUseCase` (template gen + parsing)
> - Backend: `CreateMonitoringBatchUseCase` (batch creation)
> - Backend: 3 new HTTP endpoints (template, preview, batch)
> - Frontend: Mode tabs + cycle selector + monitoring preview table on bulk page
> - Unit tests for backend computation logic
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 5 → Task 7 → Task 8 → Final

---

## Context

### Original Request
Add bulk monitoring (pemantauan) operation to the existing bulk create risk page. Two modes: "Risiko Baru" (existing) and "Pemantauan" (new). Template matches sheet ke-3 of kertas kerja export ("KK Pemantauan Reviu"). Template starts from cell A1. Only P and D are editable; Bobot, Nilai, Tingkat Risiko, Simpulan, Efektivitas are server-computed. All processing server-side.

### Interview Summary
**Key Discussions**:
- Mode: P & D only editable, rest computed — user confirmed
- Cycle: Selected in UI dropdown before upload — user confirmed
- No approved version: Skip with warning — user confirmed
- Review Summary: Not included in template — user confirmed

**Research Findings**:
- `reviewed_*` fields removed in migration 000037; reassessment drafts use same `Probability`/`Impact` fields
- `BuildPeriodicReassessmentDraft()` clones entire risk; realisasi P/D overwrite draft's P/D
- `FindInProgressReassessmentForCycle()` prevents duplicate drafts per cycle
- Existing bulk flow: 2-phase pattern (preview → submit) with `excelize` for server-side parsing
- Template structure from `buildPemantauanReviuSheet()` has 16 columns

### Metis Review
**Identified Gaps** (addressed):
- `reviewed_*` fields removed → use draft's own P/D fields (DEFAULT APPLIED)
- Business rules for Simpulan/Efektivitas unknown → applied standard comparison rules (DEFAULT APPLIED)
- Existing draft for same cycle → skip with warning (consistent with user's "skip & warning" answer)

---

## Work Objectives

### Core Objective
Add bulk monitoring (pemantauan) capability to the existing bulk risk page, allowing users to create reassessment drafts for multiple approved risks at once by uploading an Excel template.

### Concrete Deliverables
- `backend/internal/usecase/risk/bulk_monitoring.go` — Monitoring spreadsheet use case
- `backend/internal/usecase/risk/bulk_monitoring_test.go` — Unit tests
- `backend/internal/usecase/risk/create_monitoring_batch.go` — Batch creation use case
- `backend/internal/usecase/risk/create_monitoring_batch_test.go` — Unit tests
- `backend/internal/handler/http/risk.go` — New monitoring endpoints
- `frontend/src/app/(app)/risk/register/bulk/page.tsx` — Mode tabs + monitoring flow
- Frontend types and API functions

### Definition of Done
- [ ] Download monitoring template returns XLSX with pre-filled approved risk data
- [ ] Upload template correctly parses P/D values and matches to approved risks by Kode Risiko
- [ ] Preview shows errors for invalid P/D, warnings for not-found/not-approved/existing-draft risks
- [ ] Server computes Bobot, Nilai, Tingkat Risiko, Simpulan, Efektivitas
- [ ] Submit creates reassessment drafts via `BuildPeriodicReassessmentDraft()` with correct cycle
- [ ] Frontend mode switch works; Risiko Baru flow unchanged
- [ ] `go test ./internal/usecase/risk/ -run TestBulkMonitoring -v` passes
- [ ] `cd frontend && npm run build` succeeds

### Must Have
- Mode selector (Risiko Baru / Pemantauan) on bulk page
- Cycle selector dropdown (YYYY-H1 / YYYY-H2) in Pemantauan mode
- Template download with pre-filled target columns and empty realisasi columns
- Server-side parsing of monitoring template
- Server-side computation of Bobot, Nilai, Tingkat Risiko, Simpulan, Efektivitas
- Skip rows where Kode Risiko not found, risk not approved, or existing draft exists (with warnings)
- Create reassessment drafts via existing `BuildPeriodicReassessmentDraft()` + update P/D
- Frontend preview table with monitoring-specific columns

### Must NOT Have (Guardrails)
- NO `reviewed_*` database fields — use existing reassessment draft mechanism
- NO modification to existing `BulkRiskSpreadsheetUseCase` or bulk create flow
- NO approval workflow in bulk flow — creates drafts only
- NO Review Summary column in template
- NO frontend Excel parsing — all processing server-side
- NO new route/page — reuse `/risk/register/bulk` with mode switching
- NO allowing P/D changes in target columns — server uses approved values, user changes ignored
- NO direct approval — bulk monitoring only creates `assessment_draft` status

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Go test framework, `go test ./...`)
- **Automated tests**: YES (TDD) — write tests first for backend use cases
- **Framework**: Go testing with table-driven tests
- **If TDD**: Each backend task follows RED → GREEN → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.
- **Backend**: Use `go test` + `curl` for API verification
- **Frontend**: Use Playwright for UI verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── Task 1: Backend monitoring spreadsheet columns & types [quick]
├── Task 2: Backend monitoring template generation [unspecified-high]
├── Task 3: Backend monitoring preview (parse + validate + compute) [deep]
└── Task 4: Frontend types & API client functions [quick]

Wave 2 (After Wave 1 - batch creation + handler):
├── Task 5: Backend monitoring batch creation use case (depends: 3) [deep]
├── Task 6: Backend HTTP handlers & route registration (depends: 2, 3, 5) [unspecified-high]
├── Task 7: Frontend mode switcher & monitoring UI (depends: 4) [visual-engineering]
└── Task 8: Frontend monitoring preview table (depends: 4, 7) [visual-engineering]

Wave 3 (Integration):
└── Task 9: Integration testing & edge cases (depends: 6, 7, 8) [deep]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 2, 3 |
| 2 | 1 | 6 |
| 3 | 1 | 5, 6 |
| 4 | - | 7, 8 |
| 5 | 3 | 6 |
| 6 | 2, 3, 5 | 9 |
| 7 | 4 | 8, 9 |
| 8 | 4, 7 | 9 |
| 9 | 6, 7, 8 | F1-F4 |

### Agent Dispatch Summary
- **Wave 1**: 4 tasks — T1 `quick`, T2 `unspecified-high`, T3 `deep`, T4 `quick`
- **Wave 2**: 4 tasks — T5 `deep`, T6 `unspecified-high`, T7 `visual-engineering`, T8 `visual-engineering`
- **Wave 3**: 1 task — T9 `deep`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [ ] 1. Backend monitoring spreadsheet columns & types

  **What to do**:
  - Create `backend/internal/usecase/risk/bulk_monitoring.go` with monitoring-specific types:
    - `BulkMonitoringTemplateColumns` — column definitions matching "KK Pemantauan Reviu" sheet (16 columns from A1)
    - `BulkMonitoringPreviewItem` — preview row with Kode Risiko, Uraian, target scores, realisasi P/D, computed values, errors, warnings
    - `BulkMonitoringBatchItemInput` — batch creation input with code, realisasi P/D
    - `BulkMonitoringBatchItemOutput` — batch creation result with clientKey, id, status, message
    - `BulkMonitoringSpreadsheetInput/Output` — file upload input and preview output types
  - Define column layout matching `buildPemantauanReviuSheet`: NO, Kode Risiko, Uraian Risiko, Target P/D/Bobot/Nilai/Tingkat Risiko, Realisasi P/D (editable), computed columns
  - Define skip columns (computed: Bobot, Nilai, Tingkat Risiko, Simpulan, Efektivitas)
  - Define column alias map for flexible header matching

  **Must NOT do**:
  - Do NOT modify existing `BulkRiskSpreadsheetUseCase` or `bulkRiskTemplateColumns`
  - Do NOT add `reviewed_*` fields to any entity

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture patterns, Go best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/bulk_preview.go:19-88` — Existing column definition pattern (`bulkRiskTemplateColumns`, `skipCols`, `bulkRiskColumnAliases`) — follow same structure for monitoring columns
  - `backend/internal/usecase/risk/bulk_preview.go:106-113` — Preview item types pattern (`BulkRiskPreviewItem`, `BulkRiskSpreadsheetOutput`) — follow same structure

  **API/Type References**:
  - `backend/internal/usecase/risk/create_batch.go:22-65` — `CreateRiskBatchItemInput/Output` types — follow same batch I/O pattern
  - `backend/internal/domain/entity/risk.go` — `Risk` entity with all fields including `Probability`, `Impact`, `AssessmentCycle`, `ReviewType`

  **Test References**:
  - `backend/internal/usecase/risk/bulk_preview_test.go` — Test patterns for bulk preview

  **WHY Each Reference Matters**:
  - `bulk_preview.go:19-88`: Exact pattern to follow for column definitions — maps column indices to names
  - `create_batch.go:22-65`: I/O types pattern for batch creation — maintains consistency with existing batch flow

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] Test file created: `backend/internal/usecase/risk/bulk_monitoring_test.go`
  - [ ] `go test ./internal/usecase/risk/ -run TestBulkMonitoringTypes -v` → PASS

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Type definitions compile and match entity fields
    Tool: Bash (go build)
    Preconditions: File exists with type definitions
    Steps:
      1. Run `cd backend && go build ./internal/usecase/risk/`
      2. Verify no compilation errors
    Expected Result: Build succeeds with 0 errors
    Failure Indicators: Compilation error, undefined types
    Evidence: .sisyphus/evidence/task-1-types-compile.txt

  Scenario: Column layout matches "KK Pemantauan Reviu" sheet structure
    Tool: Bash (go test)
    Preconditions: Column definitions defined
    Steps:
      1. Run `cd backend && go test ./internal/usecase/risk/ -run TestBulkMonitoringTypes -v`
      2. Verify column count = 16, column names match expected layout
    Expected Result: Test passes, 16 columns defined with correct names
    Failure Indicators: Column count mismatch, wrong column names
    Evidence: .sisyphus/evidence/task-1-columns-match.txt
  ```

  **Commit**: YES (groups with 1)
  - Message: `feat(monitoring): add bulk monitoring spreadsheet types and column definitions`
  - Files: `backend/internal/usecase/risk/bulk_monitoring.go` (types section), `backend/internal/usecase/risk/bulk_monitoring_test.go`
  - Pre-commit: `cd backend && go build ./internal/usecase/risk/`

- [ ] 2. Backend monitoring template generation

  **What to do**:
  - Add `Template(ctx context.Context, orgID uuid.UUID, cycle string) ([]byte, string, error)` method to `BulkMonitoringSpreadsheetUseCase`
  - Generate XLSX starting from cell A1 matching `buildPemantauanReviuSheet` structure:
    - Row 1: Group headers (IDENTIFIKASI RISIKO cols 1-3, TARGET PENURUNAN RISIKO cols 4-8, REALISASI cols 9-13, Simpulan col 14, Efektivitas col 15, Jadwal Pelaksanaan col 16)
    - Row 2: Sub-headers (Kode Risiko, Uraian Risiko, P, D, Bobot, Nilai, Tingkat Risiko, P, D, Bobot, Nilai, Tingkat Risiko, simpulan, efektivitas, jadwal)
    - Row 3: Column numbers (1-16)
    - Data rows: Pre-fill from approved current risks for the org, with target columns filled and realisasi columns empty (editable)
    - Computed columns (Bobot, Nilai, Tingkat Risiko, Simpulan, Efektivitas) marked with gray fill and protected
    - Style: Bookman Old Style font, borders, column widths matching kertas kerja export
  - Pre-fill target P/D/Nilai/Tingkat Risiko from each risk's `TargetProbability`, `TargetImpact`, `TargetWeight`, target Nilai, target Tingkat Risiko
  - Leave realisasi P/D columns empty for user to fill
  - File name: `bulk-monitoring-template-{orgName}-{cycle}.xlsx`
  - Write unit tests for template generation

  **Must NOT do**:
  - Do NOT modify `working-paper-export.ts` or `buildPemantauanReviuSheet()`
  - Do NOT add Review Summary column
  - Do NOT allow user to edit target columns in the template

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`]
    - `backend-go`: Go patterns, excelize usage, clean architecture

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/bulk_preview.go:139-194` — `Template()` method pattern for generating XLSX with excelize
  - `backend/internal/usecase/risk/bulk_preview.go:196-323` — `writeSheet2StyleHeaders()` pattern for multi-row headers, merging, styling
  - `frontend/src/lib/working-paper-export.ts:478-613` — `buildPemantauanReviuSheet()` — EXACT column structure to replicate in Go

  **API/Type References**:
  - `backend/internal/usecase/risk/bulk_preview.go:90-97` — `BulkRiskSpreadsheetUseCase` struct with `orgRepo` and `userRepo` — same dependencies needed for monitoring
  - `backend/internal/domain/entity/risk.go` — `Risk` entity with `TargetProbability`, `TargetImpact`, `TargetWeight`, `Code`, `Title`

  **Test References**:
  - `backend/internal/usecase/risk/bulk_preview_test.go` — Test patterns for template generation and parsing

  **External References**:
  - excelize library: `github.com/xuri/excelize/v2` — already in go.mod

  **WHY Each Reference Matters**:
  - `bulk_preview.go:139-194`: Exact pattern to follow for Template() method — creates workbook, writes headers, styles, returns bytes
  - `working-paper-export.ts:478-613`: The source of truth for the "KK Pemantauan Reviu" column layout — MUST match this structure exactly
  - `bulk_preview.go:90-97`: Shows dependency injection pattern for use case constructor

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] Test file: `backend/internal/usecase/risk/bulk_monitoring_test.go` — TestTemplate()
  - [ ] `go test ./internal/usecase/risk/ -run TestBulkMonitoringTemplate -v` → PASS

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Template generation returns valid XLSX with correct structure
    Tool: Bash (go test)
    Preconditions: Test org exists in test DB with approved risks
    Steps:
      1. Call Template(ctx, orgID, "2026-H1")
      2. Verify returned bytes are valid XLSX (can open with excelize)
      3. Verify sheet name contains "Pemantauan" or "Monitoring"
      4. Verify row 1 has group headers
      5. Verify row 2 has sub-headers matching "KK Pemantauan Reviu" columns
      6. Verify row 3 has column numbers 1-16
      7. Verify data rows have pre-filled target values and empty realisasi P/D cells
    Expected Result: Valid XLSX with 16 columns, correct headers, pre-filled target data
    Failure Indicators: Invalid XLSX, wrong column count, missing headers, empty target data
    Evidence: .sisyphus/evidence/task-2-template-gen.txt

  Scenario: Template has correct file name format
    Tool: Bash (go test)
    Preconditions: Template method works
    Steps:
      1. Call Template(ctx, orgID, "2026-H1")
      2. Verify returned filename matches pattern `bulk-monitoring-template-*.xlsx`
    Expected Result: Filename contains org name and cycle
    Failure Indicators: Generic or missing filename
    Evidence: .sisyphus/evidence/task-2-template-filename.txt
  ```

  **Commit**: YES (groups with 2)
  - Message: `feat(monitoring): add monitoring template generation with excelize`
  - Files: `backend/internal/usecase/risk/bulk_monitoring.go`, `backend/internal/usecase/risk/bulk_monitoring_test.go`
  - Pre-commit: `cd backend && go test ./internal/usecase/risk/ -run TestBulkMonitoring -v`

- [ ] 3. Backend monitoring preview (parse + validate + compute)

  **What to do**:
  - Add `Preview(ctx context.Context, input BulkMonitoringSpreadsheetInput) (*BulkMonitoringSpreadsheetOutput, error)` method to `BulkMonitoringSpreadsheetUseCase`
  - Parse monitoring template (xlsx/csv) starting from cell A1
  - Find header row by detecting column number row (same pattern as `findColumnNumbersRow`)
  - Match each row's Kode Risiko to approved current risks in the organization
  - For matched risks: pre-fill target values from the approved risk
  - For realisasi P/D: parse from template (user-filled)
  - Compute derived values:
    - Bobot = `entity.GetBobot(P, D)` from 5×5 matrix
    - Nilai = `P * D * Bobot` (rounded to 2 decimals)
    - Tingkat Risiko from Nilai ranges (sangat_tinggi >=20, tinggi 15-19, sedang 10-14, rendah 5-9, sangat_rendah <5)
    - Simpulan: compare realisasi Nilai vs target Nilai — "Menurun/Sesuai" if ≤, "Meningkat" if >
    - Efektivitas: "Efektif" if realisasi Nilai ≤ target Nilai, "Tidak Efektif" otherwise
  - Validation errors: invalid P/D (not 1-5), Kode Risiko not found, risk not approved+current, existing draft for cycle
  - Validation warnings: empty P/D values (required field), non-editable columns modified
  - Write comprehensive table-driven unit tests

  **Must NOT do**:
  - Do NOT add `reviewed_*` fields to database
  - Do NOT modify frontend Excel parsing
  - Do NOT create reassessment drafts in Preview — that's for the batch creation

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`backend-go`]
    - `backend-go`: Go best practices, table-driven tests, computation logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/bulk_preview.go:119-137` — `Preview()` method pattern: parse file, iterate records, map each, return output
  - `backend/internal/usecase/risk/bulk_preview.go:325-367` — `parseBulkRiskRecords()` pattern for Excel/CSV parsing
  - `backend/internal/usecase/risk/bulk_preview.go:492-627` — `mapBulkRiskRecord()` pattern for validation, error collection, and value mapping
  - `backend/internal/usecase/risk/bulk_preview.go:402-461` — Position-based row parsing (`rowsToBulkRiskRecordsPositionBased`)

  **API/Type References**:
  - `backend/internal/domain/entity/risk.go` — `GetBobot(P, D)` function for 5×5 matrix lookup
  - `backend/internal/domain/entity/risk.go` — `Risk.CanBeReassessed()` check: `Status == RiskStatusApproved && IsCurrent`
  - `backend/internal/usecase/risk/reassess.go:113-120` — `FindInProgressReassessmentForCycle()` to check for existing drafts
  - `backend/internal/repository/postgres/risk.go` — `ListByOrgAndStatus()` or similar for finding approved current risks

  **Test References**:
  - `backend/internal/usecase/risk/bulk_preview_test.go` — Table-driven test patterns for preview parsing and validation
  - `backend/internal/usecase/risk/bulk_preview_test.go` — Test cases for edge cases: empty rows, invalid values, missing columns

  **WHY Each Reference Matters**:
  - `bulk_preview.go:119-137`: The exact Preview() workflow — parse → iterate → map → validate → return
  - `bulk_preview.go:492-627`: The validation pattern — collect errors/warnings, set payload=nil on errors
  - `reassess.go:113-120`: Needed to check if a draft already exists for the cycle — prevents duplicates
  - `entity/risk.go:CanBeReassessed()`: Must verify risk is `approved && isCurrent` before allowing monitoring

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] Test file: `backend/internal/usecase/risk/bulk_monitoring_test.go` — TestPreview*
  - [ ] `go test ./internal/usecase/risk/ -run TestBulkMonitoringPreview -v` → PASS (8+ test cases)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Preview correctly parses valid monitoring template
    Tool: Bash (go test)
    Preconditions: Test XLSX with valid P/D values, matching Kode Risiko
    Steps:
      1. Call Preview with valid monitoring template
      2. Verify items have payload with correct target values pre-filled
      3. Verify realisasi P/D parsed correctly
      4. Verify computed Bobot matches GetBobot matrix
      5. Verify computed Nilai = P * D * Bobot
      6. Verify Tingkat Risiko correct for Nilai range
      7. Verify Simpulan = "Menurun/Sesuai" when realisasi ≤ target
      8. Verify Efektivitas = "Efektif" when realisasi ≤ target
    Expected Result: All computed values correct, no errors for valid rows
    Failure Indicators: Wrong Bobot, wrong Nilai, wrong Tingkat, wrong Simpulan
    Evidence: .sisyphus/evidence/task-3-preview-valid.txt

  Scenario: Preview skips risk with existing draft for same cycle
    Tool: Bash (go test)
    Preconditions: Test data with a risk that has an existing assessment_draft for "2026-H1"
    Steps:
      1. Call Preview with Kode Risiko matching the risk with existing draft
      2. Verify row has warning "sudah memiliki draf pemantauan untuk siklus ini"
      3. Verify payload is nil (cannot submit)
    Expected Result: Warning in warnings array, payload nil
    Failure Indicators: No warning, payload created, or error instead of warning
    Evidence: .sisyphus/evidence/task-3-preview-existing-draft.txt

  Scenario: Preview skips non-approved or non-current risk
    Tool: Bash (go test)
    Preconditions: Kode Risiko matching a draft/revision risk
    Steps:
      1. Call Preview with Kode Risiko of a non-approved risk
      2. Verify warning "belum disetujui atau bukan versi terakhir"
      3. Verify payload is nil
    Expected Result: Warning message, payload nil
    Failure Indicators: Payload created for non-approved risk, or error instead of warning
    Evidence: .sisyphus/evidence/task-3-preview-not-approved.txt

  Scenario: Preview returns error for invalid P/D values
    Tool: Bash (go test)
    Preconditions: Template with P=6 (invalid, max 5) and D=0 (invalid, min 1)
    Steps:
      1. Call Preview with template containing invalid P/D
      2. Verify errors array contains P range error and D range error
      3. Verify payload is nil for invalid rows
    Expected Result: Error messages for invalid P/D, payload nil
    Failure Indicators: No error for P=6 or D=0, payload created despite invalid values
    Evidence: .sisyphus/evidence/task-3-preview-invalid-pd.txt
  ```

  **Commit**: YES (groups with 3)
  - Message: `feat(monitoring): add monitoring preview parser with score computation`
  - Files: `backend/internal/usecase/risk/bulk_monitoring.go`, `backend/internal/usecase/risk/bulk_monitoring_test.go`
  - Pre-commit: `cd backend && go test ./internal/usecase/risk/ -run TestBulkMonitoring -v`

- [ ] 4. Frontend types & API client functions

  **What to do**:
  - Create `frontend/src/types/risk-monitoring.ts` with TypeScript types:
    - `MonitoringPreviewItem` — clientKey, rowNumber, raw, code, title, targetP, targetD, targetNilai, targetTingkat, realisasiP, realisasiD, computedBobot, computedNilai, computedTingkat, simpulan, efektivitas, errors[], warnings[]
    - `MonitoringBatchPayload` — code, realisasiP, realisasiD
    - `MonitoringBatchResultItem` — clientKey, id, code, status, message, error
    - `MonitoringPreviewResponse` — items: MonitoringPreviewItem[]
    - `MonitoringBatchResponse` — items: MonitoringBatchResultItem[]
  - Create `frontend/src/lib/api/risk-monitoring.ts` with API functions:
    - `downloadMonitoringTemplate(token, orgId, cycle)` — GET `/risks/batch/monitoring/template`
    - `previewMonitoringUpload(file, token, orgId, cycle)` — POST form `/risks/batch/monitoring/preview`
    - `submitMonitoringBatch(items, token, orgId, cycle)` — POST `/risks/batch/monitoring`

  **Must NOT do**:
  - Do NOT modify existing `risk.ts` types or `api.ts` functions
  - Do NOT add UI components yet (that's Task 7)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - No special skills needed for types and API client

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/bulk/page.tsx:33-88` — Existing types for bulk risk (RiskBatchPayload, BulkRiskPreview, RiskBatchResultItem, PreviewResponse, BatchResponse) — follow same pattern
  - `frontend/src/app/(app)/risk/register/bulk/page.tsx:116-217` — Existing API call patterns (handleUpload, handleDownloadTemplate, handleSubmit)

  **API/Type References**:
  - `frontend/src/lib/api.ts` — API client with `api.post()`, `api.postForm()` methods
  - `backend/internal/usecase/risk/bulk_preview.go:106-113` — Backend preview types to mirror in TypeScript

  **WHY Each Reference Matters**:
  - `bulk/page.tsx:33-88`: Exact pattern for frontend types — mirrors backend types, same JSON field names
  - `api.ts`: Must use same auth pattern (token in header) and same base URL

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: TypeScript types compile without errors
    Tool: Bash (npx tsc)
    Preconditions: Type file created
    Steps:
      1. Run `cd frontend && npx tsc --noEmit`
      2. Verify no TypeScript errors
    Expected Result: 0 compilation errors
    Failure Indicators: Type mismatches, missing imports
    Evidence: .sisyphus/evidence/task-4-types-compile.txt

  Scenario: API functions use correct endpoints and HTTP methods
    Tool: Bash (grep)
    Preconditions: API file created
    Steps:
      1. Verify `downloadMonitoringTemplate` calls GET `/risks/batch/monitoring/template`
      2. Verify `previewMonitoringUpload` calls POST `/risks/batch/monitoring/preview`
      3. Verify `submitMonitoringBatch` calls POST `/risks/batch/monitoring`
    Expected Result: All three endpoint URLs match backend routes
    Failure Indicators: Wrong URL, wrong HTTP method, missing query params
    Evidence: .sisyphus/evidence/task-4-api-endpoints.txt
  ```

  **Commit**: YES (groups with 4)
  - Message: `feat(monitoring): add frontend types and API client for bulk monitoring`
  - Files: `frontend/src/types/risk-monitoring.ts`, `frontend/src/lib/api/risk-monitoring.ts`
  - Pre-commit: `cd frontend && npx tsc --noEmit`

- [ ] 5. Backend monitoring batch creation use case

  **What to do**:
  - Create `backend/internal/usecase/risk/create_monitoring_batch.go` with `CreateMonitoringBatchUseCase`
  - For each valid preview item:
    1. Look up approved current risk by Kode Risiko + organization scope
    2. Verify risk is still `approved && isCurrent` (re-validate)
    3. Verify no existing draft for the cycle (re-check `FindInProgressReassessmentForCycle`)
    4. Call `BuildPeriodicReassessmentDraft(sourceRisk, cycle, now, createdBy)` to create draft
    5. Update draft's `Probability` = realisasiP, `Impact` = realisasiD
    6. Recompute `Weight` = `entity.GetBobot(P, D)`
    7. Persist via `riskRepo.Create(ctx, draft)`
  - Return `CreateMonitoringBatchOutput` with per-item results (clientKey, id, code, status, message, error)
  - Write table-driven unit tests with mock repos

  **Must NOT do**:
  - Do NOT call `SubmitApprovalUseCase` — drafts only, no auto-approval
  - Do NOT skip re-validation — risks may have changed since preview
  - Do NOT create New risks — only reassessment drafts

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture, mock repositories, table-driven tests

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 3 types)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/create_batch.go:66-145` — `Execute()` pattern: iterate items, validate each, call underlying use case, collect results
  - `backend/internal/usecase/risk/reassess.go:41-111` — `CreateRiskReassessmentUseCase.Execute()` pattern for creating reassessment, checking existing drafts

  **API/Type References**:
  - `backend/internal/usecase/risk/reassess.go:122-151` — `BuildPeriodicReassessmentDraft()` — the core cloning function to use
  - `backend/internal/domain/entity/risk.go` — `Risk.CanBeReassessed()`, `RiskStatusApproved`, `IsCurrent`
  - `backend/internal/usecase/risk/create_batch.go:22-64` — Batch I/O types pattern

  **Test References**:
  - `backend/internal/usecase/risk/create_batch_test.go` — Batch creation test patterns with mock repos
  - `backend/internal/usecase/risk/reassess_test.go` — Reassessment test patterns

  **WHY Each Reference Matters**:
  - `create_batch.go:66-145`: The iteration-and-collect pattern for batch processing
  - `reassess.go:41-111`: Must follow the exact same flow for creating reassessment — check existing, clone via BuildPeriodicReassessmentDraft, persist
  - `reassess.go:122-151`: The cloning function that creates the draft — MUST call this, not manually construct

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] Test file: `backend/internal/usecase/risk/create_monitoring_batch_test.go`
  - [ ] `go test ./internal/usecase/risk/ -run TestCreateMonitoringBatch -v` → PASS

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Batch creation creates reassessment drafts for valid rows
    Tool: Bash (go test)
    Preconditions: Mock repo with 3 approved current risks
    Steps:
      1. Call Execute with 3 valid items (matching Kode Risiko)
      2. Verify 3 items returned with status="created"
      3. Verify each item has id and code populated
      4. Verify each draft has ReviewType="periodic" and correct AssessmentCycle
    Expected Result: 3 created drafts with correct cycle and review type
    Failure Indicators: Missing IDs, wrong status, wrong ReviewType, wrong AssessmentCycle
    Evidence: .sisyphus/evidence/task-5-batch-create.txt

  Scenario: Batch creation skips rows where risk has existing draft
    Tool: Bash (go test)
    Preconditions: Mock repo with 1 risk that already has assessment_draft for "2026-H1"
    Steps:
      1. Call Execute with item matching that risk
      2. Verify result has status="failed" with message about existing draft
      3. Verify NO duplicate draft was created
    Expected Result: Status="failed", no duplicate draft
    Failure Indicators: Status="created" for existing draft, or duplicate creation
    Evidence: .sisyphus/evidence/task-5-batch-existing-draft.txt

  Scenario: Batch creation updates draft Probability and Impact with realisasi values
    Tool: Bash (go test)
    Preconditions: Input with realisasiP=3, realisasiD=4
    Steps:
      1. Call Execute with item where realisasiP=3, realisasiD=4
      2. Verify created draft has Probability=3, Impact=4
      3. Verify Weight = GetBobot(3, 4)
    Expected Result: Draft P/D updated to realisasi values, Weight recomputed
    Failure Indicators: Draft still has original P/D values, Weight not recomputed
    Evidence: .sisyphus/evidence/task-5-batch-pd-update.txt
  ```

  **Commit**: YES (groups with 5)
  - Message: `feat(monitoring): add batch creation use case for reassessment drafts`
  - Files: `backend/internal/usecase/risk/create_monitoring_batch.go`, `backend/internal/usecase/risk/create_monitoring_batch_test.go`
  - Pre-commit: `cd backend && go test ./internal/usecase/risk/ -run TestCreateMonitoringBatch -v`

- [ ] 6. Backend HTTP handlers & route registration

  **What to do**:
  - Add 3 handler methods to `RiskHandler` in `backend/internal/handler/http/risk.go`:
    1. `DownloadMonitoringTemplate(c *fiber.Ctx)` — GET `/api/risks/batch/monitoring/template`
       - Parse `organization_id` and `cycle` query params
       - Validate cycle format with `IsValidCycleFormat()`
       - Call `monitoringSpreadsheetUC.Template(ctx, orgID, cycle)`
       - Return XLSX file with Content-Disposition header
    2. `PreviewMonitoringBatchUpload(c *fiber.Ctx)` — POST `/api/risks/batch/monitoring/preview`
       - Parse multipart form file (max 5MB)
       - Parse `organization_id` and `cycle` query params
       - Validate file extension (.xlsx, .xls, .csv)
       - Call `monitoringSpreadsheetUC.Preview(ctx, input)`
       - Return JSON with preview items
    3. `CreateMonitoringBatch(c *fiber.Ctx)` — POST `/api/risks/batch/monitoring`
       - Parse JSON body with `items` array and `cycle`
       - Call `createMonitoringBatchUC.Execute(ctx, input)`
       - Return JSON with batch results
  - Wire up use cases in bootstrap/DI
  - Register routes in `cmd/server/main.go` (or equivalent router setup)
  - Max batch size: 100 items (same as existing bulk create)

  **Must NOT do**:
  - Do NOT modify existing bulk risk handler methods
  - Do NOT register routes that conflict with existing routes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`]
    - `backend-go`: Fiber handlers, route registration, DI wiring

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 2, 3, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 3, 5

  **References**:

  **Pattern References**:
  - `backend/internal/handler/http/risk.go:399-460` — `DownloadBulkRiskTemplate`, `PreviewRiskBatchUpload` handler patterns
  - `backend/internal/handler/http/risk.go:499-540` — `CreateRiskBatch` handler pattern with max batch size
  - `backend/cmd/server/main.go` — Route registration pattern

  **API/Type References**:
  - `backend/internal/handler/http/risk.go:462-468` — `createRiskBatchRequest` struct pattern
  - `backend/internal/usecase/risk/bulk_preview.go:97-104` — `BulkRiskSpreadsheetInput` struct

  **WHY Each Reference Matters**:
  - `risk.go:399-460`: Exact handler pattern for file upload, template download, and preview — follow same structure
  - `risk.go:499-540`: Batch creation handler with size limit — follow same pattern with monitoring-specific types

  **Acceptance Criteria**:

  **If TDD**:
  - [ ] Handler tests for all 3 endpoints
  - [ ] `go test ./internal/handler/http/ -run TestMonitoring -v` → PASS

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: GET /risks/batch/monitoring/template returns valid XLSX
    Tool: Bash (curl)
    Preconditions: Server running, valid auth token, org with approved risks
    Steps:
      1. `curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/risks/batch/monitoring/template?organization_id=$ORG_ID&cycle=2026-H1" -o monitoring-template.xlsx`
      2. Verify HTTP 200 status
      3. Verify Content-Type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
      4. Verify file size > 0
    Expected Result: 200, valid XLSX downloaded
    Failure Indicators: 404, 500, empty file, wrong Content-Type
    Evidence: .sisyphus/evidence/task-6-template-endpoint.txt

  Scenario: POST /risks/batch/monitoring/preview parses template
    Tool: Bash (curl)
    Preconditions: Filled template uploaded
    Steps:
      1. `curl -s -H "Authorization: Bearer $TOKEN" -F "file=@monitoring-filled.xlsx" "http://localhost:8080/api/risks/batch/monitoring/preview?organization_id=$ORG_ID&cycle=2026-H1"`
      2. Verify JSON response with items array
      3. Verify each item has clientKey, raw, errors/warnings
    Expected Result: 200, JSON with preview items
    Failure Indicators: 400, 413, empty items, missing validation
    Evidence: .sisyphus/evidence/task-6-preview-endpoint.txt

  Scenario: POST /risks/batch/monitoring creates drafts
    Tool: Bash (curl)
    Preconditions: Valid preview items submitted
    Steps:
      1. `curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"items":[...],"cycle":"2026-H1"}' "http://localhost:8080/api/risks/batch/monitoring?organization_id=$ORG_ID"`
      2. Verify JSON response with items array
      3. Verify each successful item has id, code, status="created"
    Expected Result: 201, JSON with batch results
    Failure Indicators: 400, 500, missing id, wrong status
    Evidence: .sisyphus/evidence/task-6-batch-endpoint.txt

  Scenario: Invalid cycle format returns 400
    Tool: Bash (curl)
    Steps:
      1. `curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/risks/batch/monitoring/template?organization_id=$ORG_ID&cycle=invalid"`
      2. Verify 400 status with error message about cycle format
    Expected Result: 400 with descriptive error
    Failure Indicators: 200 (accepted invalid cycle), 500
    Evidence: .sisyphus/evidence/task-6-invalid-cycle.txt
  ```

  **Commit**: YES (groups with 6)
  - Message: `feat(monitoring): add HTTP handlers for monitoring template, preview, and batch`
  - Files: `backend/internal/handler/http/risk.go`, bootstrap/DI files, route registration
  - Pre-commit: `cd backend && go build ./cmd/server/`

- [ ] 7. Frontend mode switcher & cycle selector

  **What to do**:
  - Modify `frontend/src/app/(app)/risk/register/bulk/page.tsx` to add:
    1. Tabs component with "Risiko Baru" and "Pemantauan" options (use shadcn `Tabs`/`TabsList`/`TabsTrigger`)
    2. When "Pemantauan" selected:
       - Show cycle selector dropdown with auto-generated options (current year + previous year, H1/H2)
       - Cycle defaults to current half (e.g., "2026-H1" if before July, "2026-H2" if July+)
       - Use `data-testid="cycle-selector"` for E2E testing
    3. Conditionally switch API calls:
       - "Risiko Baru": existing `/risks/batch/template`, `/risks/batch/preview`, `/risks/batch`
       - "Pemantauan": new `/risks/batch/monitoring/template`, `/risks/batch/monitoring/preview`, `/risks/batch/monitoring`
    4. Conditionally switch template download filename
    5. Require cycle selection before file upload in Pemantauan mode
    6. Require org selection (for non-unit roles) in both modes
  - Add `data-testid="bulk-mode-tabs"` for E2E testing
  - Keep all existing Risiko Baru functionality intact

  **Must NOT do**:
  - Do NOT break existing Risiko Baru flow
  - Do NOT create a new page/route
  - Do NOT add monitoring preview table (that's Task 8)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: React state management, conditional rendering, component patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (starts Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/bulk/page.tsx:1-382` — Existing bulk page component — add mode state and conditional rendering
  - `frontend/src/components/ui/tabs.tsx` — shadcn Tabs component

  **API/Type References**:
  - `frontend/src/types/risk-monitoring.ts` — Task 4 types (will be available)
  - `frontend/src/lib/api/risk-monitoring.ts` — Task 4 API functions (will be available)

  **WHY Each Reference Matters**:
  - `bulk/page.tsx`: The exact file to modify — need to understand its state management and flow
  - `tabs.tsx`: shadcn component to use for mode switching

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Mode tabs render and switch correctly
    Tool: Playwright
    Steps:
      1. Navigate to /risk/register/bulk
      2. Verify "Risiko Baru" tab is active by default
      3. Verify cycle selector is NOT visible
      4. Click "Pemantauan" tab
      5. Verify cycle selector appears with data-testid="cycle-selector"
      6. Verify cycle defaults to current half (e.g., "2026-H1")
      7. Click "Risiko Baru" tab
      8. Verify cycle selector disappears
    Expected Result: Tab switching works, cycle selector appears/disappears correctly
    Failure Indicators: Cycle selector visible in Risiko Baru mode, no tab switching
    Evidence: .sisyphus/evidence/task-7-mode-switch.png

  Scenario: Download template URL changes based on mode
    Tool: Playwright
    Steps:
      1. Navigate to /risk/register/bulk
      2. Click "Download template" in Risiko Baru mode
      3. Verify URL contains `/risks/batch/template`
      4. Switch to Pemantauan mode, select cycle "2026-H1"
      5. Click "Download template"
      6. Verify URL contains `/risks/batch/monitoring/template?cycle=2026-H1`
    Expected Result: Different URLs based on mode
    Failure Indicators: Same URL for both modes, missing cycle param
    Evidence: .sisyphus/evidence/task-7-template-url.png

  Scenario: Upload requires cycle selection in Pemantauan mode
    Tool: Playwright
    Steps:
      1. Navigate to /risk/register/bulk
      2. Switch to Pemantauan mode
      3. Attempt to upload without selecting cycle
      4. Verify error toast "Pilih siklus pemantauan terlebih dahulu"
      5. Select a cycle
      6. Upload file — verify no error
    Expected Result: Upload blocked without cycle, allowed with cycle
    Failure Indicators: Upload allowed without cycle selection
    Evidence: .sisyphus/evidence/task-7-cycle-required.png
  ```

  **Commit**: YES (groups with 7)
  - Message: `feat(monitoring): add mode switcher and cycle selector to bulk page`
  - Files: `frontend/src/app/(app)/risk/register/bulk/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [ ] 8. Frontend monitoring preview table & batch submit

  **What to do**:
  - Add monitoring-specific preview table state and rendering to `page.tsx`
  - When mode is "Pemantauan", show monitoring preview columns:
    - Baris, Kode Risiko, Uraian Risiko, Target P/D/Nilai/Tingkat (from approved risk), Realisasi P/D (user input), Bobot/Nilai/Tingkat/Simpulan/Efektivitas (computed by server), Status, Catatan
  - Show warnings for: risk not found, risk not approved, existing draft for cycle, invalid P/D
  - Monitor preview data comes from `POST /risks/batch/monitoring/preview` response (which includes computed values)
  - Add batch submit for Pemantauan mode: `POST /risks/batch/monitoring`
  - Show results table with created/failed counts per row

  **Must NOT do**:
  - Do NOT modify Risiko Baru preview table or submit logic
  - Do NOT add Review Summary column

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: React state, conditional rendering, table components

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 4, 7

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/bulk/page.tsx:89-155` — Preview table pattern with Badge styling and error/warning display
  - `frontend/src/app/(app)/risk/register/bulk/page.tsx:184-217` — Submit handler pattern with valid rows filter and batch API call

  **API/Type References**:
  - `frontend/src/types/risk-monitoring.ts` — `MonitoringPreviewItem` type (from Task 4)
  - `frontend/src/lib/api/risk-monitoring.ts` — `previewMonitoringUpload()`, `submitMonitoringBatch()` (from Task 4)

  **WHY Each Reference Matters**:
  - `bulk/page.tsx:89-155`: Exact pattern for preview table — same layout, different columns
  - `bulk/page.tsx:184-217`: Exact pattern for submit handler — validate, filter valid, POST, show results

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Monitoring preview table shows correct columns
    Tool: Playwright
    Steps:
      1. Switch to Pemantauan mode, select cycle, upload valid template
      2. Verify table headers include: Kode Risiko, Uraian, Target P, Target D, Realisasi P, Realisasi D, Bobot, Nilai, Tingkat Risiko, Simpulan, Efektivitas
      3. Verify each row shows pre-filled target values
      4. Verify each row shows server-computed Bobot, Nilai, Tingkat, Simpulan, Efektivitas
    Expected Result: All columns visible with correct data
    Failure Indicators: Missing columns, wrong data, computed values empty
    Evidence: .sisyphus/evidence/task-8-preview-table.png

  Scenario: Submit creates reassessment drafts
    Tool: Playwright
    Steps:
      1. Switch to Pemantauan mode, select cycle, upload template, wait for preview
      2. Click "Submit monitoring" button
      3. Verify results show "N created" badge
      4. Verify each successful row has code and "created" status
      5. Verify failed rows show error messages
    Expected Result: Results table with created/failed counts
    Failure Indicators: No results, all failed, missing codes
    Evidence: .sisyphus/evidence/task-8-batch-submit.png

  Scenario: Warnings displayed for skipped risks
    Tool: Playwright
    Steps:
      1. Upload template with a Kode Risiko that doesn't exist
      2. Verify warning badge "Warning" displayed
      3. Verify warning message contains text about risk not found
      4. Verify the row has no submit payload (cannot be submitted)
    Expected Result: Warning shown, row excluded from submit
    Failure Indicators: No warning shown, row submittable despite warning
    Evidence: .sisyphus/evidence/task-8-warnings.png
  ```

  **Commit**: YES (groups with 8)
  - Message: `feat(monitoring): add monitoring preview table and batch submit to bulk page`
  - Files: `frontend/src/app/(app)/risk/register/bulk/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [ ] 9. Integration testing & edge cases

  **What to do**:
  - Write Go integration tests for the full monitoring flow:
    1. Template download → fill → preview → submit → verify drafts created
    2. Preview with invalid cycle format → 400 error
    3. Preview with Kode Risiko not found → warning in preview
    4. Preview with P/D out of range → error in preview
    5. Batch submit with partial failures → some created, some failed
    6. Batch submit with existing draft for cycle → all skipped with warnings
  - Test frontend build succeeds
  - Verify Risiko Baru flow still works (regression test)

  **Must NOT do**:
  - Do NOT modify existing functionality
  - Do NOT add new features beyond testing

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`backend-go`]
    - `backend-go`: Table-driven integration tests, mock setup

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6, 7, 8

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/bulk_preview_test.go` — Existing test patterns for bulk flow
  - `backend/internal/usecase/risk/create_batch_test.go` — Existing batch creation test patterns
  - `backend/internal/usecase/risk/reassess_test.go` — Reassessment test patterns

  **WHY Each Reference Matters**:
  - Tests must cover the full flow from template generation through batch creation
  - Edge cases must match the error/warning conditions from the preview

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Full integration flow: template → preview → submit → drafts created
    Tool: Bash (go test)
    Steps:
      1. Generate monitoring template for org with 3 approved risks
      2. Fill template with realisasi P/D values
      3. Parse via Preview → verify 3 valid items
      4. Submit via CreateMonitoringBatch → verify 3 draft risks created
      5. Verify each draft has ReviewType="periodic", AssessmentCycle="2026-H1"
      6. Verify each draft has Probability/Impact = realisasi values
    Expected Result: 3 drafts created with correct data
    Failure Indicators: Missing drafts, wrong ReviewType, wrong P/D values
    Evidence: .sisyphus/evidence/task-9-full-flow.txt

  Scenario: Risiko Baru flow unchanged (regression)
    Tool: Bash (go test)
    Steps:
      1. Run existing bulk risk tests: `go test ./internal/usecase/risk/ -run TestBulkRisk -v`
      2. Verify all existing tests still pass
    Expected Result: All existing tests pass
    Failure Indicators: Any existing test failure
    Evidence: .sisyphus/evidence/task-9-regression.txt

  Scenario: Frontend build succeeds
    Tool: Bash (npm)
    Steps:
      1. Run `cd frontend && npm run build`
      2. Verify build succeeds with 0 errors
    Expected Result: Successful build
    Failure Indicators: TypeScript errors, build failures
    Evidence: .sisyphus/evidence/task-9-frontend-build.txt
  ```

  **Commit**: YES (groups with 9)
  - Message: `test(monitoring): add integration tests for bulk monitoring flow`
  - Files: `backend/internal/usecase/risk/bulk_monitoring_test.go`, `backend/internal/usecase/risk/create_monitoring_batch_test.go`
  - Pre-commit: `cd backend && go test ./internal/usecase/risk/ -v && cd ../frontend && npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks) (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `cd backend && go test ./internal/usecase/risk/ -v` + `cd frontend && npm run build`. Review all changed files for: `as any`, empty catches, console.log in prod, unused imports, AI slop.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test mode switching, template download, upload parsing, batch creation. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `feat(monitoring): add bulk monitoring spreadsheet types and column definitions` — `backend/internal/usecase/risk/bulk_monitoring.go` (types only), `go test ./internal/usecase/risk/`
- **2**: `feat(monitoring): add monitoring template generation with excelize` — `backend/internal/usecase/risk/bulk_monitoring.go`, backend/unit test
- **3**: `feat(monitoring): add monitoring preview parser with score computation` — `backend/internal/usecase/risk/bulk_monitoring.go`, `backend/internal/usecase/risk/bulk_monitoring_test.go`, `go test`
- **4**: `feat(monitoring): add frontend types and API client functions` — `frontend/src/types/risk-monitoring.ts`, `frontend/src/lib/api/risk-monitoring.ts`
- **5**: `feat(monitoring): add batch creation use case for reassessment drafts` — `backend/internal/usecase/risk/create_monitoring_batch.go`, `go test`
- **6**: `feat(monitoring): add HTTP handlers for monitoring template, preview, batch` — `backend/internal/handler/http/risk.go`, route registration, `go test`
- **7**: `feat(monitoring): add mode switcher and cycle selector to bulk page` — `frontend/src/app/(app)/risk/register/bulk/page.tsx`
- **8**: `feat(monitoring): add monitoring preview table with computed columns` — `frontend/src/app/(app)/risk/register/bulk/page.tsx`
- **9**: `test(monitoring): add integration tests for bulk monitoring flow` — `backend/...`, `frontend/...`

---

## Success Criteria

### Verification Commands
```bash
cd backend && go test ./internal/usecase/risk/ -run TestBulkMonitoring -v    # All monitoring tests pass
cd backend && go test ./internal/usecase/risk/ -run TestCreateMonitoring -v  # Batch creation tests pass
cd backend && go build ./cmd/server/                                          # Server builds
cd frontend && npm run build                                                  # Frontend builds
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/risks/batch/monitoring/template?organization_id=$ORG_ID&cycle=2026-H1" -o template.xlsx  # Template downloads
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Risiko Baru flow untouched and working
- [ ] Pemantauan flow creates reassessment drafts with correct cycle and scores