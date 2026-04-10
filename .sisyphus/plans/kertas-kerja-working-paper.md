# Kertas Kerja (Working Paper) — Risk Grouping, QR Signing & Excel Export

## TL;DR

> **Quick Summary**: Build a "Kertas Kerja" (Working Paper) feature that allows users to group approved risks into official documents, configure signatories, sign sequentially with QR code e-signatures, and export to Excel with 3 government-standard templates (Profil Risiko, KK Penilaian Risiko, KK Pemantauan Reviu).
> 
> **Deliverables**:
> - Backend: New domain model, usecases, API endpoints for working paper CRUD + sequential signing + QR generation
> - Frontend: Working paper list page, create page (risk picker + signatory config), detail/signing page, Excel export (3 templates), inbox integration
> - Database: New migration with `working_papers` + `working_paper_signatories` tables
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves, max 5 concurrent agents
> **Critical Path**: T1 → T5 → T10/T11 → T13 → F1-F4

---

## Context

### Original Request
User needs to digitize the manual "Kertas Kerja" (working paper) workflow used in Indonesian government risk management. Currently, organizations review and sign risk documents in bulk using paper worksheets. The digital version must allow grouping approved risks, configuring signatories, sequential QR code signing, and Excel export — all WITHOUT breaking the existing per-risk approval workflow.

### Interview Summary
**Key Discussions**:
- **Approval flow**: Existing Unit → Reviewer → Pimpinan per-risk approval stays intact. Kertas kerja is an ADDITIONAL layer created AFTER risks are approved.
- **Document types**: All 3 needed — Profil Risiko, KK Penilaian Risiko, KK Pemantauan Reviu. These are 3 sheets/templates exported from ONE working paper entity.
- **Signing**: Sequential order, self-built QR code e-signature in Manris (signer info + timestamp + document hash). Fully configurable signatories.
- **Lifecycle**: Simple — Create → Sign → Final. No rejection/revision. `cancelled` status for safety.
- **Grouping**: Custom select — user freely picks approved risks. Not locked to unit+period.
- **Output**: Excel only (ExcelJS infrastructure already exists).
- **Navigation**: Sub-menu under Risk Management (/risk/working-papers).
- **Notifications**: Signing requests appear in existing approval inbox.

**Research Findings**:
- **ISO 31000:2018**: Batch/periodic review is EXPLICITLY compliant (Clause 6.6 "periodic review", Clause 6.7 "appropriate mechanisms"). Indonesian PP 60/2008 (SPIP) and PermenPAN RB 5/2020 also support this workflow.
- **Backend**: Clean Architecture established. Lesson entity is cleanest template. Multi-step approval exists but no grouping concept. Next migration: 000031.
- **Frontend**: ExcelJS 4.4.0 with multi-sheet workbook support. No QR library (backend will generate). Inbox handles discriminated union of entity types. shadcn/ui components.

### Metis Review
**Identified Gaps** (addressed):
- **Risk data must be SNAPSHOTTED** at creation time as JSONB — not live-referenced. Applied.
- **Document hash from risk snapshot JSON** — not from Excel file. Applied.
- **Working paper immutable after first signature**. Applied via `draft → signing → completed` state machine.
- **3 document types = 3 export templates from ONE working paper**. Confirmed with user.
- **QR code generated server-side** (Go), returned as base64 PNG, stored in DB. Applied.
- **Separate tables from approval system** — NOT reusing approval_requests/steps. Applied.
- **Signatory metadata denormalized** per working paper (name, NIP, title stored on signatory row). Applied.
- **Org-scoped** using existing ResolveOrgScope middleware. Applied.
- **Edge case: risk deletion/status change after inclusion** — no effect, data is snapshotted. Applied.
- **Edge case: signatory deactivated mid-signing** — block signing, admin cancels working paper. Applied.
- **Edge case: concurrent signing race condition** — SELECT FOR UPDATE in transaction. Applied.

---

## Work Objectives

### Core Objective
Build a complete "Kertas Kerja" feature that enables users to group approved risks into official working paper documents with configurable sequential QR-code-signed signatories and 3-template Excel export, integrating seamlessly with the existing risk management and approval inbox.

### Concrete Deliverables
- `backend/db/migrations/000031_working_papers.up.sql` + `.down.sql`
- `backend/internal/domain/entity/working_paper.go` — domain entity + business logic
- `backend/internal/domain/repository/working_paper.go` — repository interface
- `backend/internal/repository/postgres/working_paper.go` — postgres implementation
- `backend/internal/usecase/workingpaper/` — create.go, list.go, get.go, delete.go, sign.go
- `backend/internal/pkg/qrcode/` — QR code generation utility
- `backend/internal/pkg/hash/` — document hash utility
- `backend/internal/handler/http/working_paper.go` — HTTP handlers
- `frontend/src/types/working-paper.ts` — TypeScript types
- `frontend/src/lib/api/working-papers.ts` — API client
- `frontend/src/app/(app)/risk/working-papers/page.tsx` — list page
- `frontend/src/app/(app)/risk/working-papers/new/page.tsx` — create page
- `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx` — detail/signing page
- `frontend/src/lib/working-paper-export.ts` — Excel export with 3 templates
- Updated `frontend/src/app/(app)/inbox/page.tsx` — inbox integration
- Updated sidebar navigation

### Definition of Done
- [ ] `make migrate-up` succeeds with new tables created
- [ ] All CRUD endpoints return correct responses (create, list, get, delete)
- [ ] Sequential signing flow works end-to-end (sign in order → QR generated → status progresses)
- [ ] Excel export generates valid .xlsx with 3 sheets (Profil, Penilaian, Pemantauan) + signature sheet
- [ ] Inbox shows pending signing requests for current signatory
- [ ] Existing risk CRUD and approval workflows are unaffected (zero breaking changes)

### Must Have
- Risk data snapshotted as JSONB at working paper creation time (immutable)
- Sequential signing enforcement (out-of-order returns 403)
- QR code with: working_paper_id, signer_name, signer_nip, document_hash, signed_at
- Document hash computed from deterministic JSON serialization of risk snapshots
- Org-scoped access control using existing middleware pattern
- Working paper status machine: `draft → signing → completed` (+ `cancelled`)
- All 3 Excel templates matching the government worksheet format from reference images
- Working paper immutable after first signature (no edits once signing starts)

### Must NOT Have (Guardrails)
- ❌ Do NOT modify existing `approval_requests`, `approval_steps`, or `approval_histories` tables
- ❌ Do NOT modify existing risk CRUD endpoints or domain
- ❌ Do NOT build PDF generation — Excel only
- ❌ Do NOT build a signatory management/settings page — signatories configured per working paper
- ❌ Do NOT build a QR verification portal/endpoint — out of scope for V1
- ❌ Do NOT add email/push notifications — inbox only
- ❌ Do NOT add frontend QR code library — backend generates, frontend embeds
- ❌ Do NOT build working paper versioning/revision — simple linear lifecycle
- ❌ Do NOT add template customization UI — templates are code-defined
- ❌ Do NOT allow editing risk data within a working paper — it's a snapshot
- ❌ Do NOT add "save signatory preset" or global signatory management

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: YES (Go test framework + Jest setup)
- **Automated tests**: None (per user decision)
- **Framework**: N/A
- **QA Method**: Agent-executed QA scenarios (curl for API, Playwright for UI)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) — send requests, assert status + response JSON
- **Database**: Use Bash (psql) — verify tables, constraints, indexes
- **Frontend UI**: Use Playwright (playwright skill) — navigate, interact, assert DOM, screenshot
- **Excel Export**: Use Bash (node/bun script) — generate Excel, verify sheets/rows exist

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 4 parallel, all quick):
├── T1:  Database migration (000031) [quick]
├── T2:  Backend domain entities + repository interface [quick]
├── T3:  Backend QR code + hash utilities [quick]
└── T4:  Frontend types + API client + sidebar nav [quick]

Wave 2 (Implementation - 5 parallel):
├── T5:  Backend postgres repository (depends: T1, T2) [deep]
├── T6:  Frontend working paper list page (depends: T4) [visual-engineering]
├── T7:  Frontend create page: risk picker + signatory config (depends: T4) [visual-engineering]
├── T8:  Frontend Excel export - 3 templates (depends: T4) [unspecified-high]
└── T9:  Frontend detail/signing page (depends: T4) [visual-engineering]

Wave 3 (Backend usecases + Frontend inbox - 3 parallel):
├── T10: Backend usecases: Create + List + Get + Delete (depends: T2, T5) [deep]
├── T11: Backend usecase: Sign working paper (depends: T2, T3, T5) [deep]
└── T12: Frontend inbox integration (depends: T4) [unspecified-high]

Wave 4 (API Layer - 1 task):
└── T13: Backend HTTP handlers + route registration (depends: T10, T11) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: T1 → T5 → T10/T11 → T13 → F1-F4 → user okay
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1   | —         | T5     | 1    |
| T2   | —         | T5, T10, T11 | 1 |
| T3   | —         | T11    | 1    |
| T4   | —         | T6, T7, T8, T9, T12 | 1 |
| T5   | T1, T2    | T10, T11 | 2  |
| T6   | T4        | —      | 2    |
| T7   | T4        | —      | 2    |
| T8   | T4        | —      | 2    |
| T9   | T4        | —      | 2    |
| T10  | T2, T5    | T13    | 3    |
| T11  | T2, T3, T5 | T13   | 3    |
| T12  | T4        | —      | 3    |
| T13  | T10, T11  | F1-F4  | 4    |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`
- **Wave 2**: **5** — T5→`deep`, T6→`visual-engineering`, T7→`visual-engineering`, T8→`unspecified-high`, T9→`visual-engineering`
- **Wave 3**: **3** — T10→`deep`, T11→`deep`, T12→`unspecified-high`
- **Wave 4**: **1** — T13→`unspecified-high`
- **FINAL**: **4** — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Database Migration — Working Paper Tables

  **What to do**:
  - Create `backend/db/migrations/000031_working_papers.up.sql` with:
    - `CREATE TYPE working_paper_status AS ENUM ('draft', 'signing', 'completed', 'cancelled');`
    - `CREATE TABLE working_papers`:
      - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
      - `title VARCHAR(500) NOT NULL`
      - `description TEXT`
      - `org_id UUID NOT NULL REFERENCES organizations(id)`
      - `status working_paper_status NOT NULL DEFAULT 'draft'`
      - `assessment_cycle VARCHAR(100)` (optional, for reference)
      - `risk_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb` — array of snapshotted risk data
      - `document_hash VARCHAR(64)` — SHA-256 hex of risk_snapshots JSON
      - `current_signatory_sequence INT NOT NULL DEFAULT 0` — tracks which signatory is next (0 = no signing started)
      - `created_by UUID NOT NULL REFERENCES users(id)`
      - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
      - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
      - `completed_at TIMESTAMPTZ` — when all signatories signed
      - `cancelled_at TIMESTAMPTZ`
    - Indexes: `(org_id)`, `(status)`, `(created_by)`, `(assessment_cycle)`
    - `CREATE TABLE working_paper_signatories`:
      - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
      - `working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE`
      - `user_id UUID NOT NULL REFERENCES users(id)`
      - `sequence_no INT NOT NULL` — signing order (1, 2, 3...)
      - `signer_name VARCHAR(300) NOT NULL`
      - `signer_nip VARCHAR(50)`
      - `signer_title VARCHAR(300)` — role/position title (e.g., "Pemilik Risiko", "KATIMKER 1")
      - `signer_role_label VARCHAR(200)` — display label for signature block
      - `status VARCHAR(20) NOT NULL DEFAULT 'pending'` — pending | signed
      - `signed_at TIMESTAMPTZ`
      - `qr_code_png TEXT` — base64 encoded QR code PNG, populated at signing
      - `qr_data JSONB` — structured QR payload data
      - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - Unique constraint: `UNIQUE(working_paper_id, sequence_no)`
    - Index: `(working_paper_id)`, `(user_id)`
  - Create `backend/db/migrations/000031_working_papers.down.sql`:
    - `DROP TABLE IF EXISTS working_paper_signatories;`
    - `DROP TABLE IF EXISTS working_papers;`
    - `DROP TYPE IF EXISTS working_paper_status;`

  **Must NOT do**:
  - Do NOT modify any existing migration files
  - Do NOT add columns to existing tables (risks, approval_requests, etc.)
  - Do NOT create a `working_paper_risks` junction table (risks stored as JSONB snapshot)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure SQL file creation, no complex logic, straightforward DDL
  - **Skills**: []
    - No special skills needed for SQL migration files
  - **Skills Evaluated but Omitted**:
    - `postgres-pro`: Overkill for DDL migration; no query optimization needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: T5 (postgres repository)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/db/migrations/000003_create_approval_tables.sql` — Follow table creation pattern with UUID PKs, TIMESTAMPTZ fields, and FK constraints
  - `backend/db/migrations/000010_approval_steps.up.sql` — Pattern for sequential step table with sequence_no + status
  - `backend/db/migrations/000030_approval_steps_add_step_type.up.sql` — Latest migration number, next is 000031

  **API/Type References**:
  - `backend/db/migrations/000001_initial_schema.up.sql` — Base schema patterns (users, organizations tables for FK references)

  **WHY Each Reference Matters**:
  - `000003`: Shows how approval tables with UUID + TIMESTAMPTZ + FK are structured — follow same patterns
  - `000010`: Shows the `sequence_no` pattern for ordered steps — working_paper_signatories follows this exact pattern
  - `000030`: Confirms 000031 is the next available migration number

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Migration applies cleanly
    Tool: Bash
    Preconditions: Database running, previous migrations applied
    Steps:
      1. Run: cd backend && make migrate-up
      2. Run: psql $DATABASE_URL -c "\d working_papers"
      3. Run: psql $DATABASE_URL -c "\d working_paper_signatories"
      4. Verify working_papers has columns: id, title, description, org_id, status, assessment_cycle, risk_snapshots, document_hash, current_signatory_sequence, created_by, created_at, updated_at, completed_at, cancelled_at
      5. Verify working_paper_signatories has columns: id, working_paper_id, user_id, sequence_no, signer_name, signer_nip, signer_title, signer_role_label, status, signed_at, qr_code_png, qr_data, created_at
    Expected Result: Both tables exist with correct columns and types
    Failure Indicators: Migration fails, tables missing, columns wrong type
    Evidence: .sisyphus/evidence/task-1-migration-apply.txt

  Scenario: Down migration rolls back cleanly
    Tool: Bash
    Preconditions: Up migration has been applied
    Steps:
      1. Run: cd backend && make migrate-down
      2. Run: psql $DATABASE_URL -c "\d working_papers" 2>&1
      3. Verify output contains "Did not find any relation"
    Expected Result: Tables dropped successfully
    Failure Indicators: Tables still exist, or error during rollback
    Evidence: .sisyphus/evidence/task-1-migration-rollback.txt

  Scenario: Unique constraint on signatory sequence
    Tool: Bash
    Preconditions: Migration applied, test data inserted
    Steps:
      1. Insert a working paper row
      2. Insert signatory with (working_paper_id, sequence_no=1)
      3. Try inserting another signatory with same (working_paper_id, sequence_no=1)
      4. Verify second insert fails with unique constraint violation
    Expected Result: Duplicate (working_paper_id, sequence_no) rejected
    Failure Indicators: Second insert succeeds
    Evidence: .sisyphus/evidence/task-1-unique-constraint.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(db): add working paper tables migration (000031)`
  - Files: `backend/db/migrations/000031_working_papers.up.sql`, `backend/db/migrations/000031_working_papers.down.sql`
  - Pre-commit: `cd backend && make migrate-up`

- [x] 2. Backend Domain Entities + Repository Interface

  **What to do**:
  - Create `backend/internal/domain/entity/working_paper.go`:
    - `WorkingPaper` struct with all fields matching DB schema
    - `WorkingPaperSignatory` struct with all fields
    - Status constants: `WorkingPaperStatusDraft`, `WorkingPaperStatusSigning`, `WorkingPaperStatusCompleted`, `WorkingPaperStatusCancelled`
    - `RiskSnapshot` struct for the JSONB risk data — include ALL fields needed by 3 Excel templates:
      - `OriginalRiskID`, `Code`, `Title`, `Description`, `Category`, `OrgName`
      - `Probability`, `Impact`, `Bobot`, `Nilai`, `TingkatRisiko`, `PrioritasRisiko`
      - `Sebab` (causes), `SumberRisiko`, `ControlUncontrol`, `Dampak` (impact descriptions)
      - `PengendalianUraian`, `PengendalianEfektif`, `PengendalianAdaTidakEfektif`
      - `SeleraRisiko`, `PenangananRisiko`
      - `RPRUraian`, `RPRJadwal`, `RPRPenanggungJawab`
      - `TargetP`, `TargetD`, `TargetBobot`, `TargetNilai`, `TargetTingkatRisiko`
      - `MonitoringP`, `MonitoringD`, `MonitoringBobot`, `MonitoringNilai`, `MonitoringTingkatRisiko`
      - `MonitoringSimpulanTingkatRisiko`, `MonitoringEfektivitas`
      - `JadwalPelaksanaan`
    - Business logic methods:
      - `Validate() error` — checks required fields
      - `CanSign(userID uuid.UUID) (bool, error)` — checks if user is next signatory
      - `CanDelete() bool` — only if status == draft
      - `CanCancel() bool` — only if status != completed
      - `IsComplete() bool` — status == completed
      - `NextSignatory() *WorkingPaperSignatory` — returns current pending signatory by sequence
      - `MarkSigned(signatoryID, qrPNG, qrData)` — marks signatory as signed, advances sequence
      - `ComputeHash() string` — deterministic SHA-256 of risk_snapshots JSON
  - Create `backend/internal/domain/repository/working_paper.go`:
    - `WorkingPaperRepository` interface:
      - `Create(ctx, wp *WorkingPaper) error`
      - `GetByID(ctx, id uuid.UUID) (*WorkingPaper, error)`
      - `List(ctx, orgIDs []uuid.UUID, status string, page, limit int) ([]*WorkingPaper, int, error)`
      - `Update(ctx, wp *WorkingPaper) error`
      - `Delete(ctx, id uuid.UUID) error`
      - `GetByIDForUpdate(ctx, id uuid.UUID) (*WorkingPaper, error)` — SELECT FOR UPDATE for signing
      - `GetSignatoriesByWorkingPaperID(ctx, wpID uuid.UUID) ([]*WorkingPaperSignatory, error)`
      - `UpdateSignatory(ctx, sig *WorkingPaperSignatory) error`
      - `GetPendingSigningByUserID(ctx, userID uuid.UUID, orgIDs []uuid.UUID) ([]*WorkingPaper, error)` — for inbox
      - `CountPendingSigningByUserID(ctx, userID uuid.UUID) (int, error)` — for inbox badge

  **Must NOT do**:
  - Do NOT modify existing domain entities (risk.go, approval.go, etc.)
  - Do NOT import any infrastructure packages (pgx, fiber) in domain layer
  - Do NOT add methods that depend on external services (QR generation is passed in, not called)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Interface + struct definitions with pure Go logic methods. No complex algorithms.
  - **Skills**: [`backend-go`]
    - `backend-go`: Enforces Clean Architecture and Go best practices for domain layer
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Domain layer doesn't need concurrency or gRPC patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: T5 (repo impl), T10 (usecases CRUD), T11 (usecase sign)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/internal/domain/entity/approval.go` — Follow struct naming, method patterns, status constants. Shows how ApprovalStep with sequence_no is structured — mirror for WorkingPaperSignatory
  - `backend/internal/domain/entity/risk.go` — Risk entity fields to include in RiskSnapshot struct. Status constants pattern.
  - `backend/internal/domain/entity/lesson.go` — Cleanest entity pattern to follow (per Metis recommendation)

  **API/Type References**:
  - `backend/internal/domain/repository/approval.go` — Repository interface pattern with `Create`, `GetByID`, `List`, `Update`, `Delete` signatures

  **WHY Each Reference Matters**:
  - `approval.go` entity: Shows the multi-step sequential pattern (ApprovalStep with sequence_no + status) — WorkingPaperSignatory is conceptually identical
  - `risk.go` entity: Contains ALL the fields that RiskSnapshot must capture
  - `lesson.go` entity: Cleanest Clean Architecture entity example — follow its structure
  - `approval.go` repo: Interface pattern with org-scoped queries and pagination

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Domain entities compile without errors
    Tool: Bash
    Preconditions: Go modules available
    Steps:
      1. Run: cd backend && go build ./internal/domain/...
      2. Verify exit code is 0
    Expected Result: No compilation errors
    Failure Indicators: Build errors, import cycle errors, missing types
    Evidence: .sisyphus/evidence/task-2-domain-build.txt

  Scenario: Domain layer has no infrastructure imports
    Tool: Bash
    Preconditions: Entity files created
    Steps:
      1. Run: grep -rn "pgx\|fiber\|gofiber\|jackc" backend/internal/domain/entity/working_paper.go
      2. Verify output is empty (no matches)
    Expected Result: Zero infrastructure imports in domain layer
    Failure Indicators: Any pgx, fiber, or infrastructure import found
    Evidence: .sisyphus/evidence/task-2-no-infra-imports.txt

  Scenario: ComputeHash is deterministic
    Tool: Bash
    Preconditions: Entity file exists
    Steps:
      1. Write a quick Go test in a temp file that creates a WorkingPaper with fixed risk_snapshots
      2. Call ComputeHash() twice on same data
      3. Assert both return identical SHA-256 hex strings
    Expected Result: Same input always produces same hash
    Failure Indicators: Different hash values for same input
    Evidence: .sisyphus/evidence/task-2-hash-determinism.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(domain): add working paper entity and repository interface`
  - Files: `backend/internal/domain/entity/working_paper.go`, `backend/internal/domain/repository/working_paper.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 3. Backend QR Code + Document Hash Utilities

  **What to do**:
  - Add `github.com/skip2/go-qrcode` to `backend/go.mod`: run `go get github.com/skip2/go-qrcode`
  - Create `backend/internal/pkg/qrcode/qrcode.go`:
    - `type QRPayload struct`:
      - `WorkingPaperID string`, `WorkingPaperTitle string`
      - `DocumentHash string`
      - `SignerName string`, `SignerNIP string`, `SignerTitle string`, `SignerRoleLabel string`
      - `SignedAt time.Time`
    - `func GenerateQRCode(payload QRPayload) (base64PNG string, err error)`:
      - Serialize payload to compact JSON
      - Generate QR code as PNG bytes using `qrcode.Encode(jsonStr, qrcode.Medium, 256)`
      - Return base64-encoded PNG string
  - Create `backend/internal/pkg/hash/hash.go`:
    - `func ComputeDocumentHash(riskSnapshots json.RawMessage) string`:
      - Normalize JSON (compact, sorted keys via `json.Marshal` after unmarshaling to ensure deterministic order)
      - Compute SHA-256
      - Return hex string
    - `func VerifyDocumentHash(riskSnapshots json.RawMessage, expectedHash string) bool`

  **Must NOT do**:
  - Do NOT add any other Go dependencies beyond `github.com/skip2/go-qrcode`
  - Do NOT import domain or infrastructure packages — these are pure utility functions
  - Do NOT generate QR codes on the frontend

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small utility files with well-defined input/output. No complex architecture.
  - **Skills**: [`backend-go`]
    - `backend-go`: Go best practices for utility package design
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: No concurrency or performance optimization needed here

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: T11 (sign usecase)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/internal/config/config.go` — Pattern for a utility package in the internal directory structure

  **External References**:
  - `github.com/skip2/go-qrcode` — Go QR code generation library. API: `qrcode.Encode(content string, level RecoveryLevel, size int) ([]byte, error)`
  - Go stdlib `crypto/sha256` — For document hash computation
  - Go stdlib `encoding/base64` — For PNG to base64 encoding
  - Go stdlib `encoding/json` — For deterministic JSON serialization

  **WHY Each Reference Matters**:
  - `config/config.go`: Shows how utility/pkg packages are structured in this codebase
  - `skip2/go-qrcode`: The ONLY QR code library to use — simple API, generates PNG bytes directly

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: QR code generates valid PNG
    Tool: Bash
    Preconditions: Go modules installed
    Steps:
      1. Write temp Go program that calls GenerateQRCode with test payload
      2. Decode base64 result
      3. Check first 8 bytes match PNG magic number: 0x89504E470D0A1A0A
    Expected Result: Valid base64 PNG output with correct PNG header
    Failure Indicators: Empty output, invalid base64, wrong magic bytes
    Evidence: .sisyphus/evidence/task-3-qr-valid-png.txt

  Scenario: Document hash is deterministic and changes with data
    Tool: Bash
    Preconditions: Hash utility created
    Steps:
      1. Write temp Go program that computes hash of fixed JSON: '{"risks":[{"id":"1","title":"Test"}]}'
      2. Compute hash twice, assert identical
      3. Change one field, compute again, assert DIFFERENT
    Expected Result: Same input = same hash, different input = different hash
    Failure Indicators: Non-deterministic output or collision
    Evidence: .sisyphus/evidence/task-3-hash-determinism.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(pkg): add QR code generation and document hash utilities`
  - Files: `backend/internal/pkg/qrcode/qrcode.go`, `backend/internal/pkg/hash/hash.go`, `backend/go.mod`, `backend/go.sum`
  - Pre-commit: `cd backend && go build ./...`

- [x] 4. Frontend TypeScript Types + API Client + Sidebar Navigation

  **What to do**:
  - Create `frontend/src/types/working-paper.ts`:
    - `WorkingPaperStatus` union type: `'draft' | 'signing' | 'completed' | 'cancelled'`
    - `SignatoryStatus` union type: `'pending' | 'signed'`
    - `RiskSnapshot` interface with ALL fields matching backend `RiskSnapshot` struct:
      - `original_risk_id`, `code`, `title`, `description`, `category`, `org_name`
      - `probability`, `impact`, `bobot`, `nilai`, `tingkat_risiko`, `prioritas_risiko`
      - `sebab`, `sumber_risiko`, `control_uncontrol`, `dampak`
      - `pengendalian_uraian`, `pengendalian_efektif`, `pengendalian_ada_tidak_efektif`
      - `selera_risiko`, `penanganan_risiko`
      - `rpr_uraian`, `rpr_jadwal`, `rpr_penanggung_jawab`
      - `target_p`, `target_d`, `target_bobot`, `target_nilai`, `target_tingkat_risiko`
      - `monitoring_p`, `monitoring_d`, `monitoring_bobot`, `monitoring_nilai`, `monitoring_tingkat_risiko`
      - `monitoring_simpulan_tingkat_risiko`, `monitoring_efektivitas`
      - `jadwal_pelaksanaan`
    - `WorkingPaperSignatory` interface: `id`, `working_paper_id`, `user_id`, `sequence_no`, `signer_name`, `signer_nip`, `signer_title`, `signer_role_label`, `status: SignatoryStatus`, `signed_at`, `qr_code_png`, `qr_data`
    - `WorkingPaper` interface: `id`, `title`, `description`, `org_id`, `status: WorkingPaperStatus`, `assessment_cycle`, `risk_snapshots: RiskSnapshot[]`, `document_hash`, `current_signatory_sequence`, `created_by`, `created_at`, `updated_at`, `completed_at`, `cancelled_at`, `signatories: WorkingPaperSignatory[]`
    - `CreateWorkingPaperRequest` interface: `title`, `description?`, `assessment_cycle?`, `risk_ids: string[]`, `signatories: CreateSignatoryInput[]`
    - `CreateSignatoryInput` interface: `user_id`, `sequence_no`, `signer_name`, `signer_nip?`, `signer_title`, `signer_role_label`
    - `WorkingPaperListResponse` with pagination (`data`, `total`, `page`, `limit`)
  - Create `frontend/src/lib/api/working-papers.ts`:
    - `listWorkingPapers(params: { status?, page?, limit? }): Promise<WorkingPaperListResponse>` — GET /api/v1/working-papers
    - `getWorkingPaper(id: string): Promise<WorkingPaper>` — GET /api/v1/working-papers/:id
    - `createWorkingPaper(req: CreateWorkingPaperRequest): Promise<WorkingPaper>` — POST /api/v1/working-papers
    - `deleteWorkingPaper(id: string): Promise<void>` — DELETE /api/v1/working-papers/:id
    - `signWorkingPaper(id: string): Promise<WorkingPaper>` — POST /api/v1/working-papers/:id/sign
    - `cancelWorkingPaper(id: string): Promise<void>` — POST /api/v1/working-papers/:id/cancel
    - `getPendingSigningCount(): Promise<{ count: number }>` — GET /api/v1/working-papers/pending-count
    - Use same fetch pattern as `frontend/src/lib/api/forms.ts` (base URL from env, auth token from cookie, JSON headers)
  - Update `frontend/src/app-navigation.ts`:
    - Add "Kertas Kerja" nav item under Risk Management group
    - Route: `/risk/working-papers`
    - Icon: `FileSignature` from lucide-react (or `ClipboardSignature` if available)
    - Placement: after existing risk-related items in the same group

  **Must NOT do**:
  - Do NOT modify any existing type files (risk.ts, approval.ts, etc.)
  - Do NOT create new React components in this task — types and API client only
  - Do NOT add new npm dependencies — use existing fetch infrastructure

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: TypeScript interfaces + fetch functions + one nav item. Boilerplate-heavy but simple.
  - **Skills**: [`react-expert`]
    - `react-expert`: Ensures proper TypeScript typing patterns for Next.js App Router
  - **Skills Evaluated but Omitted**:
    - `shadcn`: No UI components created in this task
    - `frontend-design`: No visual work, just types and API functions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: T6 (list page), T7 (create page), T8 (Excel export), T9 (detail page), T12 (inbox)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `frontend/src/lib/api/forms.ts` — API client pattern: base URL construction, auth token from cookie, fetch wrapper with error handling. Follow this EXACT pattern for all API functions.
  - `frontend/src/types/risk.ts` — TypeScript type definitions for risk entity. Use same naming conventions (snake_case for JSON fields matching backend). Contains the Risk interface whose fields map to RiskSnapshot.
  - `frontend/src/app-navigation.ts` — Sidebar navigation configuration. Shows how to add a nav item with icon, label, and route under a group.

  **API/Type References**:
  - `frontend/src/lib/api.ts` — Base API utility (if it exists). Check for shared fetch wrappers.
  - `frontend/src/types/approval.ts` — Type patterns for status unions and related entity types (if exists).

  **External References**:
  - lucide-react icons: `FileSignature` or `ClipboardSignature` for sidebar icon

  **WHY Each Reference Matters**:
  - `api/forms.ts`: EXACT fetch pattern to copy — ensures consistency in auth, error handling, base URL
  - `types/risk.ts`: Field names for RiskSnapshot must match the Risk type's JSON keys exactly
  - `app-navigation.ts`: Determines WHERE and HOW to add the nav item — wrong format breaks sidebar

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: TypeScript types compile without errors
    Tool: Bash
    Preconditions: Frontend dependencies installed
    Steps:
      1. Run: cd frontend && npx tsc --noEmit src/types/working-paper.ts
      2. Verify exit code is 0
    Expected Result: No type errors
    Failure Indicators: Type compilation errors
    Evidence: .sisyphus/evidence/task-4-types-compile.txt

  Scenario: API client functions have correct signatures
    Tool: Bash
    Preconditions: Types file exists
    Steps:
      1. Run: cd frontend && npx tsc --noEmit src/lib/api/working-papers.ts
      2. Verify exit code is 0
      3. Run: grep -c "export.*function\|export.*const" frontend/src/lib/api/working-papers.ts
      4. Verify count is 7 (listWorkingPapers, getWorkingPaper, createWorkingPaper, deleteWorkingPaper, signWorkingPaper, cancelWorkingPaper, getPendingSigningCount)
    Expected Result: 7 exported API functions, all compile
    Failure Indicators: Missing functions, type errors, wrong function count
    Evidence: .sisyphus/evidence/task-4-api-client.txt

  Scenario: Sidebar navigation includes Kertas Kerja
    Tool: Bash
    Preconditions: Navigation file updated
    Steps:
      1. Run: grep -n "working-papers\|Kertas Kerja" frontend/src/app-navigation.ts
      2. Verify at least one match exists with route "/risk/working-papers"
    Expected Result: Navigation entry present with correct route
    Failure Indicators: No match found, wrong route
    Evidence: .sisyphus/evidence/task-4-sidebar-nav.txt

  Scenario: Frontend build succeeds with new files
    Tool: Bash
    Preconditions: All files created
    Steps:
      1. Run: cd frontend && npm run build
      2. Verify exit code is 0
    Expected Result: Full frontend build passes
    Failure Indicators: Build fails due to type errors or import issues
    Evidence: .sisyphus/evidence/task-4-frontend-build.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(frontend): add working paper types, API client, sidebar nav`
  - Files: `frontend/src/types/working-paper.ts`, `frontend/src/lib/api/working-papers.ts`, `frontend/src/app-navigation.ts`
  - Pre-commit: `cd frontend && npm run build`

- [x] 5. Backend Postgres Repository Implementation

  **What to do**:
  - Create `backend/internal/repository/postgres/working_paper.go`:
    - `type workingPaperRepo struct { db *pgxpool.Pool }` implementing `repository.WorkingPaperRepository`
    - `func NewWorkingPaperRepository(db *pgxpool.Pool) repository.WorkingPaperRepository`
    - Implement ALL interface methods:
      - `Create(ctx, wp)` — INSERT working_paper + bulk INSERT signatories in a TRANSACTION. Use `pgx.Batch` or loop for signatories. Compute and store `document_hash` from `risk_snapshots`.
      - `GetByID(ctx, id)` — SELECT working_paper + LEFT JOIN signatories ORDER BY sequence_no. Map to domain entities.
      - `List(ctx, orgIDs, status, page, limit)` — SELECT with filters, pagination (OFFSET/LIMIT), count. Return signatories embedded (subquery or separate query).
      - `Update(ctx, wp)` — UPDATE working_paper fields (status, current_signatory_sequence, completed_at, cancelled_at, updated_at)
      - `Delete(ctx, id)` — DELETE working_paper WHERE status = 'draft' (cascade deletes signatories via FK)
      - `GetByIDForUpdate(ctx, id)` — SELECT ... FOR UPDATE within transaction context for signing concurrency
      - `GetSignatoriesByWorkingPaperID(ctx, wpID)` — SELECT signatories WHERE working_paper_id ORDER BY sequence_no
      - `UpdateSignatory(ctx, sig)` — UPDATE signatory: status, signed_at, qr_code_png, qr_data
      - `GetPendingSigningByUserID(ctx, userID, orgIDs)` — SELECT working_papers WHERE status='signing' AND current signatory matches userID. Join signatories to find papers where user_id matches AND sequence_no = current_signatory_sequence AND status='pending'.
      - `CountPendingSigningByUserID(ctx, userID)` — COUNT version of above for inbox badge
    - Use `pgx.CollectRows` or row-by-row scanning (follow whichever pattern exists in codebase)
    - Handle `NULL` fields correctly (completed_at, cancelled_at, signed_at, qr_code_png, qr_data → use pointers or pgtype)
    - JSONB scanning: use `json.RawMessage` or custom scanning for `risk_snapshots` and `qr_data`

  **Must NOT do**:
  - Do NOT modify any existing repository files
  - Do NOT create additional tables or alter existing schema
  - Do NOT use an ORM — raw SQL with pgx only (consistent with codebase)
  - Do NOT implement business logic — repository is data access ONLY

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex SQL queries (JOIN, subquery, pagination, transaction management, FOR UPDATE), JSONB handling, null-safe scanning. Requires careful attention to pgx patterns.
  - **Skills**: [`backend-go`, `postgres-pro`]
    - `backend-go`: Clean Architecture repository implementation patterns
    - `postgres-pro`: Complex query construction, JSONB operations, transaction patterns, FOR UPDATE usage
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: No concurrency patterns needed — pgx handles connection pooling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7, T8, T9)
  - **Blocks**: T10 (usecases CRUD), T11 (usecase sign)
  - **Blocked By**: T1 (migration — tables must exist), T2 (domain — interfaces must exist)

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/approval.go` — PRIMARY REFERENCE. Shows pgx repository pattern: struct, constructor, row scanning, transaction usage, pagination with COUNT + OFFSET/LIMIT, NULL handling. Follow this EXACTLY.
  - `backend/internal/repository/postgres/risk.go` — Shows JSONB scanning pattern for complex JSON fields. How `json.RawMessage` or custom types handle JSONB columns.
  - `backend/internal/repository/postgres/lesson.go` — Cleanest repository implementation. Shows simple CRUD with proper error wrapping.

  **API/Type References**:
  - `backend/internal/domain/repository/working_paper.go` (from T2) — The interface this file MUST implement. Every method signature must match exactly.
  - `backend/internal/domain/entity/working_paper.go` (from T2) — Entity structs for scanning rows into. Understand field types for pgx scanning.

  **Test References**:
  - `backend/internal/repository/postgres/approval.go` — Transaction pattern for multi-table inserts (approval_request + approval_steps in one tx)

  **External References**:
  - pgx v5 docs: `pgxpool.Pool`, `pgx.Rows`, `pgx.CollectRows`, `pgx.BeginTx`, `pgx.Tx.QueryRow`
  - PostgreSQL `SELECT ... FOR UPDATE` — row-level locking for concurrent signing prevention

  **WHY Each Reference Matters**:
  - `approval.go` repo: The CLOSEST analogy — multi-step sequential entities (steps ≈ signatories), transaction creates, join queries. This is THE template.
  - `risk.go` repo: Shows how JSONB columns (risk_snapshots) are scanned — critical for correct deserialization
  - `lesson.go` repo: Shows the cleanest CRUD pattern — use for simple methods like Delete

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Repository compiles and implements interface
    Tool: Bash
    Preconditions: T1 (migration) and T2 (domain) completed
    Steps:
      1. Run: cd backend && go build ./internal/repository/postgres/...
      2. Run: go vet ./internal/repository/postgres/...
      3. Verify exit code is 0
    Expected Result: Repository compiles with no errors or vet warnings
    Failure Indicators: Missing interface methods, type mismatches, import errors
    Evidence: .sisyphus/evidence/task-5-repo-compile.txt

  Scenario: Create + GetByID round-trips correctly
    Tool: Bash
    Preconditions: Migration applied, backend running, test user exists
    Steps:
      1. Write temp Go program (or use curl if handler exists):
         - Create a WorkingPaper with 2 signatories and 1 risk snapshot
         - Call repo.Create()
         - Call repo.GetByID() with returned ID
         - Assert: title matches, 2 signatories returned in order, risk_snapshots JSON matches, document_hash is non-empty
      2. Run the temp program
    Expected Result: Created entity round-trips through DB correctly with all fields preserved
    Failure Indicators: JSONB deserialization fails, signatories missing, NULL scanning errors
    Evidence: .sisyphus/evidence/task-5-repo-roundtrip.txt

  Scenario: GetByIDForUpdate acquires row lock
    Tool: Bash
    Preconditions: Working paper exists in DB
    Steps:
      1. Start a transaction
      2. Call GetByIDForUpdate — should succeed
      3. In a separate connection, try to UPDATE the same row within 1s timeout
      4. Verify second connection blocks or times out
    Expected Result: FOR UPDATE lock prevents concurrent modification
    Failure Indicators: Second connection succeeds immediately without waiting
    Evidence: .sisyphus/evidence/task-5-repo-lock.txt

  Scenario: GetPendingSigningByUserID returns correct working papers
    Tool: Bash
    Preconditions: Working paper with status='signing', current_signatory_sequence=1, signatory user_id=test_user at sequence_no=1
    Steps:
      1. Call GetPendingSigningByUserID(test_user_id, org_ids)
      2. Assert: returns the working paper
      3. Call GetPendingSigningByUserID(different_user_id, org_ids)
      4. Assert: returns empty
    Expected Result: Only returns papers where user is the CURRENT signatory
    Failure Indicators: Returns papers for wrong user, or returns papers where user is a future signatory
    Evidence: .sisyphus/evidence/task-5-repo-pending-signing.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(repo): implement postgres working paper repository`
  - Files: `backend/internal/repository/postgres/working_paper.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 6. Frontend Working Paper List Page

  **What to do**:
  - Create `frontend/src/app/(app)/risk/working-papers/page.tsx`:
    - Page title: "Kertas Kerja" with breadcrumb under Risk Management
    - Status filter tabs or dropdown: All, Draft, Signing, Completed, Cancelled
    - Data table (shadcn Table component) with columns:
      - Title (link to detail page)
      - Assessment Cycle
      - Status (badge with color: draft=gray, signing=yellow, completed=green, cancelled=red)
      - Risk Count (from risk_snapshots.length)
      - Signatories Progress (e.g., "2/4 signed")
      - Created At (formatted date)
      - Actions: View, Delete (draft only), Cancel (draft/signing only)
    - "Buat Kertas Kerja" (Create) button → navigates to `/risk/working-papers/new`
    - Pagination component (follow existing risk register pagination pattern)
    - Empty state when no working papers exist
    - Use `listWorkingPapers()` from API client (T4) for data fetching
    - Client-side data fetching with `useEffect` + loading/error states (follow existing patterns)
    - Confirmation dialog before Delete and Cancel actions

  **Must NOT do**:
  - Do NOT use server-side data fetching or Server Components for this page (match existing client-side pattern)
  - Do NOT build the create/detail pages — separate tasks
  - Do NOT add complex filtering beyond status (no date range, no search)
  - Do NOT add bulk actions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full page UI with data table, status badges, pagination, empty state — needs visual polish.
  - **Skills**: [`shadcn`, `react-expert`]
    - `shadcn`: Table, Badge, Button, Dialog, Pagination components
    - `react-expert`: React hooks patterns, client-side data fetching, Next.js App Router conventions
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Standard data table page — shadcn patterns sufficient
    - `polish`: Polish happens in final QA, not during initial build

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7, T8, T9)
  - **Blocks**: None
  - **Blocked By**: T4 (types + API client must exist)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — PRIMARY REFERENCE (1008 lines). Risk register page with data table, status badges, pagination, filters, actions. Follow EXACT same patterns for data fetching, table structure, loading states, and pagination.
  - `frontend/src/app/(app)/compliance/lessons/page.tsx` — Simpler list page pattern. Shows how to structure a list page with fewer columns — good for understanding minimal patterns.
  - `frontend/src/components/ui/table.tsx` — shadcn Table component. Use Table, TableHeader, TableRow, TableHead, TableBody, TableCell.
  - `frontend/src/components/ui/badge.tsx` — Status badge component.

  **API/Type References**:
  - `frontend/src/types/working-paper.ts` (from T4) — WorkingPaper, WorkingPaperStatus types
  - `frontend/src/lib/api/working-papers.ts` (from T4) — listWorkingPapers, deleteWorkingPaper, cancelWorkingPaper functions

  **WHY Each Reference Matters**:
  - `risk/register/page.tsx`: This is THE template — same table pattern, same pagination, same status badges. Don't deviate.
  - `compliance/lessons/page.tsx`: Shows a SIMPLER list page — useful if risk register is too complex to parse
  - shadcn components: Ensure correct import paths and prop patterns

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: List page renders with table structure
    Tool: Playwright
    Preconditions: Frontend running on localhost:3000, user logged in, at least 1 working paper exists
    Steps:
      1. Navigate to http://localhost:3000/risk/working-papers
      2. Wait for table to render (selector: "table" or "[role='table']")
      3. Assert page title contains "Kertas Kerja"
      4. Assert table headers include: "Title", "Status", "Risk Count" (or Indonesian equivalents)
      5. Assert at least 1 table row exists in tbody
      6. Screenshot the page
    Expected Result: Table renders with correct columns and at least one row of data
    Failure Indicators: 404 page, empty table when data exists, missing columns
    Evidence: .sisyphus/evidence/task-6-list-page.png

  Scenario: Status filter works
    Tool: Playwright
    Preconditions: Working papers exist with different statuses
    Steps:
      1. Navigate to /risk/working-papers
      2. Click/select "Draft" filter
      3. Assert all visible rows show draft status badge
      4. Click/select "All" filter
      5. Assert rows with mixed statuses appear
    Expected Result: Filter correctly shows only matching status items
    Failure Indicators: Wrong items shown, filter has no effect
    Evidence: .sisyphus/evidence/task-6-status-filter.png

  Scenario: Create button navigates to new page
    Tool: Playwright
    Preconditions: User logged in
    Steps:
      1. Navigate to /risk/working-papers
      2. Click button containing text "Buat Kertas Kerja" or "Buat"
      3. Assert URL changed to /risk/working-papers/new
    Expected Result: Navigation to create page
    Failure Indicators: Button missing, wrong navigation target
    Evidence: .sisyphus/evidence/task-6-create-nav.png

  Scenario: Empty state displays when no data
    Tool: Playwright
    Preconditions: No working papers exist (or API returns empty)
    Steps:
      1. Navigate to /risk/working-papers
      2. Assert empty state message is visible (not an empty table)
    Expected Result: User-friendly empty state message displayed
    Failure Indicators: Blank page, error message, empty table with no guidance
    Evidence: .sisyphus/evidence/task-6-empty-state.png
  ```

  **Commit**: YES (standalone)
  - Message: `feat(frontend): add working paper list page`
  - Files: `frontend/src/app/(app)/risk/working-papers/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 7. Frontend Create Page — Risk Picker + Signatory Configuration

  **What to do**:
  - Create `frontend/src/app/(app)/risk/working-papers/new/page.tsx`:
    - **Form structure** (React Hook Form + Zod validation):
      - `title` (required, text input)
      - `description` (optional, textarea)
      - `assessment_cycle` (optional, text input or dropdown with existing cycles)
    - **Risk Picker section**:
      - Fetch approved risks from existing API (`GET /api/v1/risks?status=approved`)
      - Display as selectable table/list with columns: Code, Title, Category, Risk Score, Tingkat Risiko
      - Multi-select with checkboxes
      - Show selected count: "X risiko dipilih"
      - Search/filter within the picker (client-side filter by title/code)
      - Selected risks shown as summary below picker (or in a separate panel)
    - **Signatory Configuration section**:
      - Dynamic form to add/remove signatories
      - Each signatory row: User search/select dropdown, Sequence No (auto-incrementing), Signer Title, Role Label
      - User dropdown fetches from existing users API (GET /api/v1/users or similar)
      - Auto-populate signer_name and signer_nip from selected user
      - Drag-to-reorder or up/down arrows for sequence (sequence_no auto-calculated from order)
      - Minimum 1 signatory required, no maximum limit
      - Add Signatory button at bottom
    - **Submit**:
      - Validate: title required, at least 1 risk selected, at least 1 signatory
      - Call `createWorkingPaper()` from API client
      - On success: navigate to `/risk/working-papers/{id}` (detail page)
      - On error: show error toast/message
    - **Cancel button**: navigate back to list

  **Must NOT do**:
  - Do NOT build a signatory preset/template system — configure each time
  - Do NOT allow selecting non-approved risks
  - Do NOT allow editing risk data — only selection
  - Do NOT add file upload or document attachment
  - Do NOT implement draft saving — form is submit-once

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex multi-section form with dynamic fields, search/filter, drag-reorder. Requires visual design attention.
  - **Skills**: [`shadcn`, `react-expert`]
    - `shadcn`: Form, Input, Textarea, Select, Table, Button, Dialog components + form validation patterns
    - `react-expert`: React Hook Form + Zod integration, dynamic field arrays, client-side filtering
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: shadcn + react-expert cover form design well
    - `arrange`: Form layout is straightforward — standard vertical form

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T8, T9)
  - **Blocks**: None
  - **Blocked By**: T4 (types + API client must exist)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — Risk table rendering pattern. Shows how risk data is displayed in tables — reuse column definitions for the risk picker.
  - `frontend/src/app/(app)/admin/users/page.tsx` — User list/search pattern. Shows how users are fetched and displayed — needed for signatory user picker. If this file doesn't exist, check alternative user listing locations.
  - `frontend/src/components/approval-modal.tsx` — Modal with form pattern. Shows React Hook Form + Zod in a form context within this project.

  **API/Type References**:
  - `frontend/src/types/working-paper.ts` (from T4) — CreateWorkingPaperRequest, CreateSignatoryInput
  - `frontend/src/lib/api/working-papers.ts` (from T4) — createWorkingPaper function
  - `frontend/src/types/risk.ts` — Risk interface for risk picker display
  - `frontend/src/lib/api.ts` or relevant API file — Existing risk listing function to fetch approved risks

  **External References**:
  - React Hook Form: `useFieldArray` for dynamic signatory rows
  - Zod: Schema validation with `z.array().min(1)` for at least 1 risk and 1 signatory

  **WHY Each Reference Matters**:
  - `risk/register/page.tsx`: Risk table column definitions — reuse for risk picker to maintain consistency
  - `admin/users/page.tsx`: User fetching pattern for signatory dropdown — critical for user search
  - `approval-modal.tsx`: Shows how this project structures React Hook Form + Zod — follow same pattern

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Create form renders with all sections
    Tool: Playwright
    Preconditions: Frontend running, user logged in
    Steps:
      1. Navigate to /risk/working-papers/new
      2. Assert page title contains "Buat Kertas Kerja" or "Create"
      3. Assert input field for "title" exists (selector: "input[name='title']" or "[placeholder*='title']")
      4. Assert risk picker section is visible with table/list of approved risks
      5. Assert signatory section is visible with at least 1 row
      6. Assert submit button exists
      7. Screenshot the full page
    Expected Result: Complete form with title, risk picker, and signatory sections
    Failure Indicators: Missing sections, 404, form doesn't render
    Evidence: .sisyphus/evidence/task-7-create-form.png

  Scenario: Risk picker allows multi-select and shows count
    Tool: Playwright
    Preconditions: At least 3 approved risks exist
    Steps:
      1. Navigate to /risk/working-papers/new
      2. Wait for risk list to load
      3. Click checkbox for first risk
      4. Click checkbox for second risk
      5. Assert selected count text shows "2" (e.g., "2 risiko dipilih")
      6. Screenshot risk picker section
    Expected Result: Multi-select works, count updates
    Failure Indicators: Checkboxes non-functional, count doesn't update
    Evidence: .sisyphus/evidence/task-7-risk-picker.png

  Scenario: Signatory rows can be added and reordered
    Tool: Playwright
    Preconditions: Form rendered
    Steps:
      1. Navigate to /risk/working-papers/new
      2. Assert 1 signatory row exists initially
      3. Click "Add Signatory" button
      4. Assert 2 signatory rows exist
      5. Verify sequence numbers are 1 and 2
    Expected Result: Dynamic signatory rows work correctly
    Failure Indicators: Add button missing, rows don't increment
    Evidence: .sisyphus/evidence/task-7-signatory-add.png

  Scenario: Validation prevents empty submission
    Tool: Playwright
    Preconditions: Form rendered, no fields filled
    Steps:
      1. Navigate to /risk/working-papers/new
      2. Click submit button without filling any fields
      3. Assert validation error messages appear (title required, risks required, signatories required)
    Expected Result: Validation errors displayed, form not submitted
    Failure Indicators: Form submits without validation, no error messages
    Evidence: .sisyphus/evidence/task-7-validation-errors.png

  Scenario: Successful creation navigates to detail page
    Tool: Playwright
    Preconditions: Backend running, approved risks exist, valid users exist
    Steps:
      1. Navigate to /risk/working-papers/new
      2. Fill title: "Kertas Kerja Q1 2025"
      3. Select 2 approved risks
      4. Configure 2 signatories with valid users
      5. Click submit
      6. Assert URL changes to /risk/working-papers/{uuid}
      7. Assert success toast or detail page renders
    Expected Result: Working paper created, navigated to detail page
    Failure Indicators: 500 error, stays on form, no navigation
    Evidence: .sisyphus/evidence/task-7-create-success.png
  ```

  **Commit**: YES (standalone)
  - Message: `feat(frontend): add working paper create page with risk picker`
  - Files: `frontend/src/app/(app)/risk/working-papers/new/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 8. Frontend Excel Export — 3 Government Document Templates

  **What to do**:
  - Create `frontend/src/lib/working-paper-export.ts`:
    - Main function: `exportWorkingPaper(workingPaper: WorkingPaper): Promise<void>` — generates and downloads .xlsx file
    - File name: `Kertas_Kerja_{title}_{date}.xlsx`
    - **Sheet 1: "Profil Risiko"** (Risk Profile):
      - Header: Government header format (Organization name, period, document title)
      - Table columns matching government template from reference images:
        - No, Kode Risiko, Uraian Risiko, Kategori Risiko, Pemilik Risiko
        - Sebab (Causes), Sumber Risiko, Dampak
        - Probabilitas, Dampak Score, Bobot, Nilai Risiko, Tingkat Risiko, Prioritas Risiko
      - One row per risk snapshot
      - Styled: borders, header background color, text wrapping, column widths
    - **Sheet 2: "KK Penilaian Risiko"** (Risk Assessment Working Paper):
      - Columns matching reference image:
        - No, Kode Risiko, Uraian Risiko
        - Pengendalian yang Ada: Uraian, Efektif, Ada Tidak Efektif
        - Selera Risiko, Penanganan Risiko
        - RPR: Uraian, Jadwal, Penanggung Jawab
      - One row per risk snapshot
      - Styled: borders, merged cells for group headers, text wrapping
    - **Sheet 3: "KK Pemantauan Reviu"** (Monitoring Review Working Paper):
      - Columns matching reference image:
        - No, Kode Risiko, Uraian Risiko
        - Target: Probabilitas, Dampak, Bobot, Nilai, Tingkat Risiko
        - Realisasi/Monitoring: Probabilitas, Dampak, Bobot, Nilai, Tingkat Risiko
        - Simpulan Tingkat Risiko, Efektivitas
        - Jadwal Pelaksanaan
      - One row per risk snapshot
      - Styled: borders, merged cells, conditional formatting for risk levels
    - **Sheet 4: "Tanda Tangan"** (Signatures):
      - Signatory table: Sequence, Name, NIP, Title, Role Label, Status, Signed At
      - QR code images embedded (from base64 PNG) for each signed signatory — use ExcelJS `workbook.addImage()` + `worksheet.addImage()`
      - Document hash displayed at top
      - Footer: "Dokumen ini ditandatangani secara elektronik melalui Manris"
    - Use ExcelJS (already installed) for workbook creation
    - All sheets should use consistent styling: font family, header colors, border styles
    - Indonesian language for all headers and labels

  **Must NOT do**:
  - Do NOT generate PDF — Excel only
  - Do NOT add a template selection UI — all 3 sheets always included
  - Do NOT call backend for export — pure frontend generation from WorkingPaper data
  - Do NOT add print styles or print preview
  - Do NOT create new npm dependencies — ExcelJS is already available

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex Excel generation with multiple sheets, merged cells, embedded images (QR PNGs), and government-format styling. Requires careful ExcelJS API usage.
  - **Skills**: []
    - No specific skills needed — ExcelJS API work is library-specific
  - **Skills Evaluated but Omitted**:
    - `react-expert`: No React components — pure utility function
    - `frontend-design`: No UI — just Excel file generation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T9)
  - **Blocks**: None
  - **Blocked By**: T4 (types must exist for WorkingPaper, RiskSnapshot interfaces)

  **References**:

  **Pattern References**:
  - `frontend/src/lib/risk-cycle-detail-export.ts` — PRIMARY REFERENCE. Multi-sheet ExcelJS workbook generation. Shows how to create workbook, add multiple worksheets, set columns, style headers, add rows, apply borders, trigger download. Follow this EXACT pattern.
  - `frontend/src/lib/risk-export.ts` — Simpler single-sheet export. Shows download trigger pattern with `URL.createObjectURL`.

  **API/Type References**:
  - `frontend/src/types/working-paper.ts` (from T4) — WorkingPaper, RiskSnapshot, WorkingPaperSignatory interfaces
  - ExcelJS types for `Workbook`, `Worksheet`, `Column`, `Row`, `Cell`, `Image`

  **External References**:
  - ExcelJS docs: `workbook.addImage({ base64: string, extension: 'png' })` — for embedding QR code PNGs
  - ExcelJS docs: `worksheet.mergeCells()` — for government-format merged header cells
  - ExcelJS docs: `worksheet.addImage(imageId, { tl, br })` — positioning images in cells

  **WHY Each Reference Matters**:
  - `risk-cycle-detail-export.ts`: This is THE template — same library (ExcelJS), same patterns (multi-sheet, styled headers, download). Copy structure directly.
  - `risk-export.ts`: Shows the download trigger mechanism — `FileSaver.saveAs()` or `createObjectURL` pattern
  - Reference images from user: The government worksheet format that Excel sheets MUST match

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Export generates valid .xlsx with 4 sheets
    Tool: Bash
    Preconditions: Working paper exists with 3 risk snapshots and 2 signatories (1 signed with QR)
    Steps:
      1. Write a Node.js script that:
         a. Imports the exportWorkingPaper function (or calls it via test harness)
         b. Creates a mock WorkingPaper object with test data
         c. Generates the Excel file to disk (modify export to accept output path for testing)
      2. Use ExcelJS to read the generated file:
         a. Assert workbook has 4 sheets
         b. Assert sheet names: "Profil Risiko", "KK Penilaian Risiko", "KK Pemantauan Reviu", "Tanda Tangan"
         c. Assert sheet 1 has 3 data rows (matching 3 risk snapshots)
         d. Assert sheet 4 has signatory data and QR image embedded
    Expected Result: Valid .xlsx with 4 sheets, correct data, embedded QR images
    Failure Indicators: Missing sheets, wrong sheet names, no data rows, QR image missing
    Evidence: .sisyphus/evidence/task-8-excel-export.xlsx, .sisyphus/evidence/task-8-excel-validation.txt

  Scenario: Export handles empty/null fields gracefully
    Tool: Bash
    Preconditions: Node.js available
    Steps:
      1. Create mock WorkingPaper with minimal data (many optional fields null/undefined)
      2. Call export function
      3. Assert no errors thrown
      4. Assert file generates successfully (non-zero file size)
    Expected Result: Export succeeds with partial data, empty cells for missing fields
    Failure Indicators: TypeError on null access, corrupt .xlsx, function throws
    Evidence: .sisyphus/evidence/task-8-excel-empty-fields.txt

  Scenario: Sheet columns match government template format
    Tool: Bash
    Preconditions: Generated .xlsx file from scenario 1
    Steps:
      1. Read sheet 1 header row
      2. Assert headers include: "No", "Kode Risiko", "Uraian Risiko", "Probabilitas", "Dampak", "Tingkat Risiko"
      3. Read sheet 2 header row
      4. Assert headers include: "Pengendalian", "Selera Risiko", "RPR"
      5. Read sheet 3 header row
      6. Assert headers include: "Target", "Realisasi", "Simpulan"
    Expected Result: All 3 sheets have correct government-standard column headers
    Failure Indicators: Wrong column names, missing columns, wrong order
    Evidence: .sisyphus/evidence/task-8-excel-headers.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(frontend): add Excel export with 3 document templates`
  - Files: `frontend/src/lib/working-paper-export.ts`
  - Pre-commit: `cd frontend && npm run build`

- [x] 9. Frontend Detail/Signing Page

  **What to do**:
  - Create `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`:
    - **Header section**:
      - Title, Description, Assessment Cycle, Status badge, Created date
      - Document hash display (truncated with copy-to-clipboard)
      - Action buttons: Cancel (if draft/signing), Delete (if draft), Export Excel (calls T8 export function)
    - **Risk Snapshots section**:
      - Expandable/collapsible table or accordion showing all snapshotted risks
      - Columns: Code, Title, Category, Probability, Impact, Risk Score, Risk Level
      - Read-only — no editing allowed
      - "Risiko dalam Kertas Kerja" section header
    - **Signatory Progress section**:
      - Visual timeline/stepper showing all signatories in order
      - Each step shows: Sequence No, Name, Title, Role Label, Status
      - Signed signatories show: ✓ green check, signed_at timestamp, QR code image (clickable to view full size)
      - Pending (current): highlighted/active state with "Menunggu tanda tangan" label
      - Future: grayed out
    - **Sign Action** (for current signatory):
      - IF current user IS the next signatory AND status == 'signing':
        - Show prominent "Tanda Tangani" (Sign) button
        - Confirmation dialog: "Anda akan menandatangani Kertas Kerja ini sebagai {role_label}. Tanda tangan menggunakan QR code elektronik. Lanjutkan?"
        - On confirm: call `signWorkingPaper(id)` API
        - On success: refresh page, show success toast with QR code preview
      - IF current user is NOT the next signatory: show "Menunggu tanda tangan dari {name}" message
    - **Status transitions displayed**:
      - Draft → "Belum ada tanda tangan" (No signatures yet) + first signatory highlighted
      - Signing → progress shown on stepper
      - Completed → all steps green, "Kertas Kerja selesai" banner, Export button prominent
      - Cancelled → "Dibatalkan" banner with cancelled_at timestamp
    - Fetch data with `getWorkingPaper(id)` from API client

  **Must NOT do**:
  - Do NOT allow editing working paper details after creation
  - Do NOT allow editing risk snapshot data
  - Do NOT build a QR verification page — just display the QR image
  - Do NOT add comment/note functionality
  - Do NOT build revision or version history

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex detail page with stepper/timeline visualization, QR code display, conditional sign action, status-based rendering. Strong visual component.
  - **Skills**: [`shadcn`, `react-expert`]
    - `shadcn`: Card, Badge, Button, Dialog, Accordion, Stepper/Timeline components
    - `react-expert`: Dynamic route params `[id]`, conditional rendering, API integration
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: shadcn + react-expert cover the design needs
    - `animate`: No animations required for V1

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T8)
  - **Blocks**: None
  - **Blocked By**: T4 (types + API client must exist)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — Shows how risk data is displayed in tables. Reuse risk column patterns for the snapshot table.
  - `frontend/src/components/approval-modal.tsx` — Shows confirmation dialog pattern with action buttons and status display. Pattern for the sign confirmation dialog.
  - `frontend/src/app/(app)/inbox/page.tsx` — Shows how different entity types render detail views. Status-based conditional rendering pattern.

  **API/Type References**:
  - `frontend/src/types/working-paper.ts` (from T4) — WorkingPaper, WorkingPaperSignatory, RiskSnapshot
  - `frontend/src/lib/api/working-papers.ts` (from T4) — getWorkingPaper, signWorkingPaper, cancelWorkingPaper, deleteWorkingPaper
  - `frontend/src/lib/working-paper-export.ts` (from T8) — exportWorkingPaper function for Excel download

  **External References**:
  - shadcn/ui Stepper or custom timeline component pattern for signatory progress visualization
  - Next.js dynamic route: `params.id` in App Router page component

  **WHY Each Reference Matters**:
  - `risk/register/page.tsx`: Risk table column rendering — reuse for snapshot display consistency
  - `approval-modal.tsx`: Confirmation dialog pattern for signing — same UX pattern
  - `inbox/page.tsx`: Status-based conditional rendering — same approach for sign button visibility

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Detail page renders with all sections
    Tool: Playwright
    Preconditions: Working paper exists with status=draft, 2 risks, 3 signatories
    Steps:
      1. Navigate to /risk/working-papers/{id}
      2. Assert title is displayed
      3. Assert status badge shows "Draft"
      4. Assert risk snapshot section shows 2 rows
      5. Assert signatory section shows 3 entries in order
      6. Screenshot full page
    Expected Result: All sections render correctly with data
    Failure Indicators: 404, missing sections, wrong data
    Evidence: .sisyphus/evidence/task-9-detail-page.png

  Scenario: Current signatory sees Sign button
    Tool: Playwright
    Preconditions: Working paper status=signing, current_signatory_sequence=1, logged in as user matching signatory sequence 1
    Steps:
      1. Navigate to /risk/working-papers/{id}
      2. Assert "Tanda Tangani" button is visible and enabled
      3. Click the button
      4. Assert confirmation dialog appears with signer details
      5. Screenshot the dialog
    Expected Result: Sign button visible for current signatory, confirmation dialog works
    Failure Indicators: Button missing, dialog doesn't appear, wrong signatory info
    Evidence: .sisyphus/evidence/task-9-sign-button.png

  Scenario: Non-current signatory sees waiting message
    Tool: Playwright
    Preconditions: Working paper status=signing, logged in as user who is NOT the current signatory
    Steps:
      1. Navigate to /risk/working-papers/{id}
      2. Assert "Tanda Tangani" button is NOT visible
      3. Assert waiting message is displayed (e.g., "Menunggu tanda tangan dari {name}")
    Expected Result: Sign button hidden, waiting message shown
    Failure Indicators: Sign button visible for wrong user
    Evidence: .sisyphus/evidence/task-9-waiting-message.png

  Scenario: Completed working paper shows all QR codes and Export button
    Tool: Playwright
    Preconditions: Working paper status=completed, all signatories signed
    Steps:
      1. Navigate to /risk/working-papers/{id}
      2. Assert all signatory steps show green checkmarks
      3. Assert QR code images are visible for each signed signatory (selector: "img[alt*='QR']" or similar)
      4. Assert Export Excel button is prominent/visible
      5. Assert completion banner is shown
      6. Screenshot full page
    Expected Result: Completed state with all QR codes, export button, and completion banner
    Failure Indicators: Missing QR images, no export button, incomplete signatory display
    Evidence: .sisyphus/evidence/task-9-completed-page.png

  Scenario: Export Excel button triggers download
    Tool: Playwright
    Preconditions: Working paper with completed status
    Steps:
      1. Navigate to /risk/working-papers/{id}
      2. Click Export Excel button
      3. Assert download starts (check for download event or file in downloads folder)
    Expected Result: .xlsx file downloaded
    Failure Indicators: No download, error thrown, wrong file format
    Evidence: .sisyphus/evidence/task-9-excel-download.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(frontend): add working paper detail and signing page`
  - Files: `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 10. Backend Usecases — Create + List + Get + Delete

  **What to do**:
  - Create `backend/internal/usecase/workingpaper/` directory
  - Create `backend/internal/usecase/workingpaper/create.go`:
    - `type CreateWorkingPaperInput struct`:
      - `Title`, `Description`, `AssessmentCycle`, `OrgID`, `CreatedByUserID`
      - `RiskIDs []uuid.UUID` — IDs of approved risks to include
      - `Signatories []CreateSignatoryInput` — ordered signatory definitions
    - `type CreateSignatoryInput struct`: `UserID`, `SequenceNo`, `SignerName`, `SignerNIP`, `SignerTitle`, `SignerRoleLabel`
    - `func (uc *UseCase) Create(ctx, input CreateWorkingPaperInput) (*entity.WorkingPaper, error)`:
      1. Validate input: title required, at least 1 risk, at least 1 signatory
      2. Fetch risks by IDs from existing risk repository — verify ALL are status=approved and belong to user's org
      3. If any risk not found or not approved → return error
      4. Build `[]RiskSnapshot` from risk entities — map ALL fields from Risk to RiskSnapshot
      5. Serialize risk_snapshots to JSON, compute document_hash using hash utility (T3)
      6. Create WorkingPaper entity with status=draft, risk_snapshots=JSONB, document_hash
      7. Create WorkingPaperSignatory entities from input
      8. Call repo.Create() — persists in transaction
      9. Return created working paper
  - Create `backend/internal/usecase/workingpaper/list.go`:
    - `func (uc *UseCase) List(ctx, orgIDs []uuid.UUID, status string, page, limit int) ([]*entity.WorkingPaper, int, error)`
    - Validate pagination params (default page=1, limit=20, max limit=100)
    - Call repo.List()
  - Create `backend/internal/usecase/workingpaper/get.go`:
    - `func (uc *UseCase) Get(ctx, id uuid.UUID, orgIDs []uuid.UUID) (*entity.WorkingPaper, error)`
    - Fetch by ID, verify org access
  - Create `backend/internal/usecase/workingpaper/delete.go`:
    - `func (uc *UseCase) Delete(ctx, id uuid.UUID, userID uuid.UUID) error`
    - Fetch working paper, verify status == draft (cannot delete non-draft)
    - Verify requestor is the creator (or check appropriate permission)
    - Call repo.Delete()
  - Create `backend/internal/usecase/workingpaper/usecase.go`:
    - `type UseCase struct` with dependencies: `WorkingPaperRepo`, `RiskRepo` (existing), `HashUtil`
    - `func NewWorkingPaperUseCase(wpRepo, riskRepo, hashUtil) *UseCase`

  **Must NOT do**:
  - Do NOT modify existing risk usecase or repository
  - Do NOT add approval integration — kertas kerja is independent
  - Do NOT implement sign usecase here — separate task (T11)
  - Do NOT add cancel usecase here — keep scope focused on CRUD
  - Do NOT add email or push notifications

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-file usecase with risk-to-snapshot mapping, cross-repository validation (risk status check), hash computation, and org-scope enforcement. Business logic requires careful attention.
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean Architecture usecase patterns, dependency injection, error handling
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: No concurrency patterns needed in usecase layer
    - `postgres-pro`: Usecase doesn't write SQL — delegates to repository

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12)
  - **Blocks**: T13 (HTTP handlers need usecases)
  - **Blocked By**: T2 (domain entities), T5 (repository implementation)

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/approval/submit.go` — PRIMARY REFERENCE. Shows usecase that creates a multi-step entity (approval with steps). Pattern: validate input → fetch related entities → build domain objects → call repo.Create(). Follow this EXACTLY for Create usecase.
  - `backend/internal/usecase/risk/` — Risk usecase directory. Shows CRUD usecase structure: separate files per operation, shared UseCase struct with dependencies.
  - `backend/internal/usecase/lesson/` — Simpler CRUD usecase. Good template for List/Get/Delete operations.

  **API/Type References**:
  - `backend/internal/domain/entity/working_paper.go` (from T2) — WorkingPaper, WorkingPaperSignatory, RiskSnapshot entities
  - `backend/internal/domain/entity/risk.go` — Risk entity fields that map to RiskSnapshot. CRITICAL: must map EVERY field correctly.
  - `backend/internal/domain/repository/working_paper.go` (from T2) — WorkingPaperRepository interface
  - `backend/internal/domain/repository/risk.go` — Existing RiskRepository interface for fetching risks by IDs
  - `backend/internal/pkg/hash/hash.go` (from T3) — ComputeDocumentHash function

  **WHY Each Reference Matters**:
  - `approval/submit.go`: THE closest analogy — creates parent + children (approval + steps ≈ working paper + signatories). Same validation → build → persist flow.
  - `risk/` usecase: Shows how CRUD is organized per-file — follow same file naming convention
  - `risk.go` entity: Field-level reference for mapping Risk → RiskSnapshot. Missing a field = incomplete snapshot.
  - `hash.go`: Used in Create to compute document_hash from serialized risk_snapshots

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Create usecase builds correct snapshot from risks
    Tool: Bash
    Preconditions: Backend running, approved risks exist, test user with org access
    Steps:
      1. Call Create usecase (via handler in T13, or via Go test harness):
         - Title: "Test Kertas Kerja"
         - RiskIDs: [risk_1_id, risk_2_id] (must be approved)
         - Signatories: [{user_id: user1, sequence_no: 1, ...}, {user_id: user2, sequence_no: 2, ...}]
      2. Verify returned WorkingPaper:
         - status == "draft"
         - risk_snapshots has 2 entries
         - risk_snapshots[0].title matches original risk title
         - document_hash is non-empty 64-char hex string
         - signatories has 2 entries ordered by sequence_no
    Expected Result: Working paper created with snapshotted risk data and computed hash
    Failure Indicators: Missing fields in snapshot, wrong hash, status not draft
    Evidence: .sisyphus/evidence/task-10-create-snapshot.txt

  Scenario: Create rejects non-approved risks
    Tool: Bash
    Preconditions: Risk exists with status=draft (not approved)
    Steps:
      1. Call Create with risk_ids including the draft risk
      2. Assert error returned indicating "risk not approved" or similar
      3. Assert no working paper created in DB
    Expected Result: 400-level error, no working paper persisted
    Failure Indicators: Working paper created with non-approved risk, no error
    Evidence: .sisyphus/evidence/task-10-reject-non-approved.txt

  Scenario: Delete only works on draft status
    Tool: Bash
    Preconditions: Working paper exists with status=signing
    Steps:
      1. Call Delete usecase with the signing working paper ID
      2. Assert error returned indicating "cannot delete non-draft working paper"
      3. Verify working paper still exists in DB
    Expected Result: Delete rejected for non-draft, entity preserved
    Failure Indicators: Working paper deleted despite non-draft status
    Evidence: .sisyphus/evidence/task-10-delete-draft-only.txt

  Scenario: List returns paginated results filtered by status
    Tool: Bash
    Preconditions: 5+ working papers exist with mixed statuses
    Steps:
      1. Call List(status="draft", page=1, limit=2)
      2. Assert returned count <= 2
      3. Assert all returned items have status="draft"
      4. Assert total count reflects actual draft count
    Expected Result: Paginated, status-filtered results with correct total
    Failure Indicators: Wrong status in results, pagination wrong, total incorrect
    Evidence: .sisyphus/evidence/task-10-list-paginated.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(usecase): implement working paper CRUD usecases`
  - Files: `backend/internal/usecase/workingpaper/usecase.go`, `backend/internal/usecase/workingpaper/create.go`, `backend/internal/usecase/workingpaper/list.go`, `backend/internal/usecase/workingpaper/get.go`, `backend/internal/usecase/workingpaper/delete.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 11. Backend Usecase — Sign Working Paper (Sequential Signing with QR)

  **What to do**:
  - Create `backend/internal/usecase/workingpaper/sign.go`:
    - `func (uc *UseCase) Sign(ctx, workingPaperID uuid.UUID, signerUserID uuid.UUID) (*entity.WorkingPaper, error)`:
      1. Acquire row lock: call `repo.GetByIDForUpdate(ctx, workingPaperID)` — prevents concurrent signing
      2. Validate state:
         - Status MUST be `draft` or `signing` (if draft, transition to signing on first sign)
         - Status MUST NOT be `completed` or `cancelled`
      3. Get next signatory: call `wp.NextSignatory()` — returns signatory with sequence_no == current_signatory_sequence + 1 (or 1 if first sign)
      4. Validate signer:
         - `nextSignatory.UserID` MUST equal `signerUserID`
         - If not: return 403 error "not your turn to sign"
      5. Generate QR code:
         - Build `QRPayload` with: working_paper_id, working_paper_title, document_hash, signer_name, signer_nip, signer_title, signer_role_label, signed_at=now()
         - Call `qrcode.GenerateQRCode(payload)` (from T3) → get base64 PNG
         - Build `qr_data` JSONB from payload
      6. Mark signatory as signed:
         - Set `status = "signed"`, `signed_at = now()`, `qr_code_png = base64PNG`, `qr_data = payload`
         - Call `repo.UpdateSignatory(ctx, signatory)`
      7. Advance working paper:
         - Increment `current_signatory_sequence`
         - Check if this was the LAST signatory (sequence_no == total signatories count)
           - If YES: set `status = "completed"`, `completed_at = now()`
           - If NO: set `status = "signing"` (stays in signing)
         - Call `repo.Update(ctx, wp)`
      8. Return updated working paper
    - ALL of the above runs in a single database TRANSACTION (the one started by GetByIDForUpdate)
  - Create `backend/internal/usecase/workingpaper/cancel.go`:
    - `func (uc *UseCase) Cancel(ctx, workingPaperID uuid.UUID, userID uuid.UUID) error`:
      1. Fetch working paper
      2. Validate: status != "completed" (cannot cancel completed)
      3. Set status = "cancelled", cancelled_at = now()
      4. Call repo.Update()
  - Update `backend/internal/usecase/workingpaper/usecase.go`:
    - Add `QRCodeGenerator` dependency (from T3 qrcode package)
    - Update constructor to accept QR dependency

  **Must NOT do**:
  - Do NOT allow signing out of order — strict sequential enforcement
  - Do NOT allow re-signing (already signed → error)
  - Do NOT allow signing cancelled or completed working papers
  - Do NOT send notifications from usecase — handler/middleware responsibility
  - Do NOT modify the risk_snapshots or document_hash during signing
  - Do NOT allow the creator to auto-sign all — each signatory must call individually

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex business logic with transaction management, row locking (SELECT FOR UPDATE), state machine transitions, QR generation integration, and multiple edge case validations. This is the core business logic.
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean Architecture usecase, transaction management, error handling
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Useful for concurrency but the concurrency here is DB-level (FOR UPDATE), not goroutine-level
    - `postgres-pro`: Transaction logic is in repository layer, not usecase

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T12)
  - **Blocks**: T13 (HTTP handlers need sign usecase)
  - **Blocked By**: T2 (domain entities), T3 (QR + hash utilities), T5 (repository)

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/approval/action.go` — PRIMARY REFERENCE. Shows usecase that processes a sequential action (approve/reject step). Pattern: fetch entity → validate state → validate actor → perform action → update → check completion. Sign usecase follows this EXACT same flow.
  - `backend/internal/usecase/approval/submit.go` — Shows transaction-scoped operations and multi-entity updates in one usecase.

  **API/Type References**:
  - `backend/internal/domain/entity/working_paper.go` (from T2) — WorkingPaper methods: CanSign(), NextSignatory(), MarkSigned()
  - `backend/internal/domain/repository/working_paper.go` (from T2) — GetByIDForUpdate(), UpdateSignatory(), Update()
  - `backend/internal/pkg/qrcode/qrcode.go` (from T3) — GenerateQRCode(payload) function
  - `backend/internal/pkg/hash/hash.go` (from T3) — ComputeDocumentHash (for verification)

  **WHY Each Reference Matters**:
  - `approval/action.go`: EXACT same pattern — sequential step processing with actor validation and completion detection. The sign usecase is conceptually identical to "approve a step".
  - `approval/submit.go`: Transaction pattern — how to wrap multiple repo calls in a single tx
  - Entity methods (CanSign, NextSignatory): Business logic is in entity, usecase orchestrates. DON'T duplicate logic.

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: First signatory signs successfully, status transitions to signing
    Tool: Bash
    Preconditions: Working paper status=draft, 3 signatories configured, logged in as signatory #1
    Steps:
      1. Call Sign(wp_id, signatory_1_user_id)
      2. Assert returned working paper:
         - status == "signing"
         - current_signatory_sequence == 1
         - signatory[0].status == "signed"
         - signatory[0].signed_at is not null
         - signatory[0].qr_code_png is non-empty base64 string
         - signatory[0].qr_data contains document_hash, signer_name
         - signatory[1].status == "pending"
    Expected Result: First signature recorded, status moves to signing, QR generated
    Failure Indicators: Status doesn't change, QR missing, wrong signatory updated
    Evidence: .sisyphus/evidence/task-11-first-sign.txt

  Scenario: Out-of-order signing is rejected
    Tool: Bash
    Preconditions: Working paper status=signing, current_signatory_sequence=1, signatory #2 tries to sign
    Steps:
      1. Call Sign(wp_id, signatory_2_user_id)
      2. Assert error returned with 403 or "not your turn"
      3. Assert no signatory status changed in DB
    Expected Result: 403 error, no state change
    Failure Indicators: Signing succeeds for wrong user, state changes
    Evidence: .sisyphus/evidence/task-11-out-of-order.txt

  Scenario: Last signatory signs, status transitions to completed
    Tool: Bash
    Preconditions: Working paper with 2 signatories, signatory #1 already signed, signatory #2 is current
    Steps:
      1. Call Sign(wp_id, signatory_2_user_id)
      2. Assert returned working paper:
         - status == "completed"
         - completed_at is not null
         - All signatories have status == "signed"
    Expected Result: Working paper completed after final signature
    Failure Indicators: Status still "signing", completed_at null
    Evidence: .sisyphus/evidence/task-11-final-sign.txt

  Scenario: Signing cancelled working paper is rejected
    Tool: Bash
    Preconditions: Working paper status=cancelled
    Steps:
      1. Call Sign(wp_id, any_signatory_user_id)
      2. Assert error returned indicating "cannot sign cancelled working paper"
    Expected Result: Error returned, no state change
    Failure Indicators: Signing succeeds on cancelled paper
    Evidence: .sisyphus/evidence/task-11-sign-cancelled.txt

  Scenario: Cancel sets status and timestamp
    Tool: Bash
    Preconditions: Working paper status=signing
    Steps:
      1. Call Cancel(wp_id, user_id)
      2. Assert working paper status == "cancelled"
      3. Assert cancelled_at is not null
    Expected Result: Status cancelled, timestamp recorded
    Failure Indicators: Status unchanged, timestamp missing
    Evidence: .sisyphus/evidence/task-11-cancel.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(usecase): implement sequential signing with QR generation`
  - Files: `backend/internal/usecase/workingpaper/sign.go`, `backend/internal/usecase/workingpaper/cancel.go`, `backend/internal/usecase/workingpaper/usecase.go` (updated)
  - Pre-commit: `cd backend && go build ./...`

- [x] 12. Frontend Inbox Integration — Working Paper Signing Notifications

  **What to do**:
  - Update `frontend/src/app/(app)/inbox/page.tsx`:
    - Add "Kertas Kerja" as a new entity type in the inbox discriminated union
    - Fetch pending working paper signing count using `getPendingSigningCount()` from API client (T4)
    - Display working paper signing requests in the inbox list alongside existing approval items
    - Each working paper inbox item shows:
      - Icon: FileSignature (matching sidebar icon)
      - Title: "Tanda tangan Kertas Kerja: {title}"
      - Subtitle: "Anda adalah penandatangan #{sequence_no} ({role_label})"
      - Status: "Menunggu tanda tangan Anda"
      - Action: Click navigates to `/risk/working-papers/{id}` (detail/signing page)
    - Add tab/filter for "Kertas Kerja" type in inbox (alongside existing "Approval" tab if applicable)
    - Show badge count for pending working paper signings
    - Sort by created_at (most recent first), interleaved with existing approval items
  - Update inbox badge in sidebar/header:
    - Add working paper pending count to total inbox badge
    - If `app-header.tsx` or `app-sidebar.tsx` shows inbox count, include working paper count

  **Must NOT do**:
  - Do NOT restructure existing inbox layout — ADD to it
  - Do NOT modify existing approval item rendering
  - Do NOT change the inbox route path
  - Do NOT add mark-as-read functionality
  - Do NOT add email or push notifications

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integrating into existing complex component (inbox). Requires understanding existing discriminated union pattern and adding to it without breaking anything. Integration work, not new feature.
  - **Skills**: [`react-expert`]
    - `react-expert`: Understanding existing component patterns, discriminated unions in TypeScript, conditional rendering
  - **Skills Evaluated but Omitted**:
    - `shadcn`: No new shadcn components — reusing existing inbox UI patterns
    - `visual-engineering`: This is integration, not visual design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T11)
  - **Blocks**: None
  - **Blocked By**: T4 (types + API client)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/inbox/page.tsx` — PRIMARY REFERENCE. The file being modified. Understand the FULL structure: how entity types are discriminated, how items are rendered, how counts are fetched, how filtering works. Must integrate without breaking.
  - `frontend/src/components/app-header.tsx` — Header component that may show inbox badge count. Check if count needs updating.
  - `frontend/src/components/app-sidebar.tsx` — Sidebar may show inbox badge. Check if count needs updating.

  **API/Type References**:
  - `frontend/src/types/working-paper.ts` (from T4) — WorkingPaper type for inbox item data
  - `frontend/src/lib/api/working-papers.ts` (from T4) — getPendingSigningCount() for badge count
  - `frontend/src/types/approval.ts` — Existing approval types to understand the discriminated union pattern

  **WHY Each Reference Matters**:
  - `inbox/page.tsx`: THE file being modified. Wrong integration = broken inbox for ALL entity types. Must understand full structure first.
  - `app-header.tsx` / `app-sidebar.tsx`: Badge count integration points. Missing these = stale badge count.
  - Existing approval types: Must add WorkingPaper as a new union member following same pattern

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Inbox shows working paper signing requests
    Tool: Playwright
    Preconditions: User has pending working paper to sign (is current signatory), frontend running
    Steps:
      1. Navigate to /inbox
      2. Wait for inbox items to load
      3. Assert at least one item contains text "Kertas Kerja" or "Tanda tangan"
      4. Assert the item shows the working paper title
      5. Screenshot inbox page
    Expected Result: Working paper signing request visible in inbox
    Failure Indicators: No working paper items shown, only approval items visible
    Evidence: .sisyphus/evidence/task-12-inbox-wp-item.png

  Scenario: Clicking inbox item navigates to working paper detail
    Tool: Playwright
    Preconditions: Working paper signing item visible in inbox
    Steps:
      1. Navigate to /inbox
      2. Click the working paper signing item
      3. Assert URL changes to /risk/working-papers/{id}
    Expected Result: Navigation to working paper detail/signing page
    Failure Indicators: Wrong URL, stays on inbox, 404
    Evidence: .sisyphus/evidence/task-12-inbox-navigate.png

  Scenario: Existing approval items still render correctly
    Tool: Playwright
    Preconditions: Both approval items and working paper items exist
    Steps:
      1. Navigate to /inbox
      2. Assert approval items are still visible and correctly formatted
      3. Assert clicking an approval item still works (navigates correctly)
    Expected Result: Existing approval functionality completely unaffected
    Failure Indicators: Approval items broken, wrong rendering, navigation fails
    Evidence: .sisyphus/evidence/task-12-existing-approvals.png

  Scenario: Inbox badge count includes working paper pending count
    Tool: Playwright
    Preconditions: User has 2 pending approvals + 1 pending working paper signing
    Steps:
      1. Navigate to any page (to see sidebar/header badge)
      2. Check inbox badge count in sidebar or header
      3. Assert count is 3 (2 approvals + 1 working paper)
    Expected Result: Badge count includes both types
    Failure Indicators: Count only shows approvals (2 instead of 3), badge missing
    Evidence: .sisyphus/evidence/task-12-badge-count.png
  ```

  **Commit**: YES (standalone)
  - Message: `feat(frontend): integrate working paper signing into inbox`
  - Files: `frontend/src/app/(app)/inbox/page.tsx`, optionally `frontend/src/components/app-header.tsx`, `frontend/src/components/app-sidebar.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 13. Backend HTTP Handlers + Route Registration

  **What to do**:
  - Create `backend/internal/handler/http/working_paper.go`:
    - `type WorkingPaperHandler struct { uc *workingpaper.UseCase }`
    - `func NewWorkingPaperHandler(uc *workingpaper.UseCase) *WorkingPaperHandler`
    - Handler methods:
      - `CreateWorkingPaper(c *fiber.Ctx) error`:
        - Parse JSON body → CreateWorkingPaperInput
        - Get orgID from context (ResolveOrgScope middleware)
        - Get userID from JWT context
        - Call `uc.Create(ctx, input)` → return 201 with created working paper JSON
      - `ListWorkingPapers(c *fiber.Ctx) error`:
        - Parse query params: `status`, `page`, `limit`
        - Get orgIDs from context
        - Call `uc.List(ctx, orgIDs, status, page, limit)` → return 200 with paginated response
      - `GetWorkingPaper(c *fiber.Ctx) error`:
        - Parse `:id` param as UUID
        - Get orgIDs from context
        - Call `uc.Get(ctx, id, orgIDs)` → return 200 with working paper + signatories
      - `DeleteWorkingPaper(c *fiber.Ctx) error`:
        - Parse `:id` param
        - Get userID from context
        - Call `uc.Delete(ctx, id, userID)` → return 204 no content
      - `SignWorkingPaper(c *fiber.Ctx) error`:
        - Parse `:id` param
        - Get userID from JWT context
        - Call `uc.Sign(ctx, id, userID)` → return 200 with updated working paper
      - `CancelWorkingPaper(c *fiber.Ctx) error`:
        - Parse `:id` param
        - Get userID from context
        - Call `uc.Cancel(ctx, id, userID)` → return 200 with updated working paper
      - `GetPendingSigningCount(c *fiber.Ctx) error`:
        - Get userID from JWT context
        - Call `repo.CountPendingSigningByUserID(ctx, userID)` → return 200 with `{ count: N }`
    - Error handling: map domain errors to HTTP status codes:
      - Not found → 404
      - Validation error → 400
      - Not authorized (wrong signatory) → 403
      - State error (wrong status) → 409 Conflict
    - Response format: follow existing `{ data: ..., message: "..." }` envelope pattern
  - Update `backend/cmd/server/main.go`:
    - Import new packages: `workingpaper` usecase, `working_paper` handler
    - Instantiate: `wpRepo := postgres.NewWorkingPaperRepository(db)`
    - Instantiate: `wpUseCase := workingpaper.NewWorkingPaperUseCase(wpRepo, riskRepo, hashUtil, qrGen)`
    - Instantiate: `wpHandler := http.NewWorkingPaperHandler(wpUseCase)`
    - Register routes under authenticated group:
      ```
      wp := api.Group("/working-papers")
      wp.Get("/", wpHandler.ListWorkingPapers)
      wp.Get("/pending-count", wpHandler.GetPendingSigningCount)
      wp.Get("/:id", wpHandler.GetWorkingPaper)
      wp.Post("/", wpHandler.CreateWorkingPaper)
      wp.Delete("/:id", wpHandler.DeleteWorkingPaper)
      wp.Post("/:id/sign", wpHandler.SignWorkingPaper)
      wp.Post("/:id/cancel", wpHandler.CancelWorkingPaper)
      ```
    - Apply existing auth middleware (JWT) and org-scope middleware to the group

  **Must NOT do**:
  - Do NOT modify existing route registrations
  - Do NOT change existing middleware behavior
  - Do NOT add new middleware (reuse existing JWT + OrgScope)
  - Do NOT add rate limiting or throttling
  - Do NOT add WebSocket or SSE for real-time updates

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTTP handler implementation with route registration in main.go. Must follow exact patterns from existing handlers and wire dependencies correctly. Integration with multiple usecases.
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean Architecture handler patterns, dependency wiring, Fiber HTTP handling
  - **Skills Evaluated but Omitted**:
    - `api-designer`: API endpoints already defined in plan, no design decisions needed
    - `golang-pro`: Standard HTTP handler code, no advanced patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (solo)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: T10 (CRUD usecases), T11 (sign usecase)

  **References**:

  **Pattern References**:
  - `backend/internal/handler/http/approval.go` — PRIMARY REFERENCE. Shows Fiber handler pattern: struct with usecase dependency, request parsing (params, body, query), org-scope from context, JWT user extraction, response formatting, error mapping. Follow this EXACTLY.
  - `backend/internal/handler/http/risk.go` — Alternative handler reference. Shows CRUD handlers pattern for risk entity.
  - `backend/cmd/server/main.go:376-552` — Route registration section. Shows how to: instantiate repo → instantiate usecase → instantiate handler → register routes with group and middleware. Follow this exact wiring pattern.

  **API/Type References**:
  - `backend/internal/usecase/workingpaper/usecase.go` (from T10/T11) — UseCase struct and all method signatures
  - `backend/internal/middleware/auth.go` — JWT middleware for extracting user ID from context
  - `backend/internal/middleware/org_scope.go` — Org scope middleware for extracting org IDs from context

  **WHY Each Reference Matters**:
  - `approval.go` handler: Same handler patterns — request parsing, context extraction, error mapping. The sign handler mirrors the "action" handler pattern.
  - `main.go:376-552`: THE wiring location. Wrong placement or missing dependency = runtime panic. Must follow exact instantiation order.
  - Middleware references: Must know the exact context keys for JWT userID and org scope orgIDs.

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: POST /api/v1/working-papers creates working paper
    Tool: Bash (curl)
    Preconditions: Backend running, migration applied, approved risks exist, valid JWT token
    Steps:
      1. Get JWT token: curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password"}' | jq -r '.data.token'
      2. Create working paper:
         curl -s -X POST http://localhost:8080/api/v1/working-papers \
           -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" \
           -d '{
             "title": "Kertas Kerja Test",
             "risk_ids": ["<approved_risk_uuid>"],
             "signatories": [{"user_id": "<user_uuid>", "sequence_no": 1, "signer_name": "Test User", "signer_title": "Manager", "signer_role_label": "Pemilik Risiko"}]
           }'
      3. Assert HTTP 201
      4. Assert response body contains "data" with "id", "title", "status"="draft", "risk_snapshots" array, "document_hash"
    Expected Result: 201 with created working paper including snapshotted data
    Failure Indicators: 500, 400, missing fields in response, empty risk_snapshots
    Evidence: .sisyphus/evidence/task-13-create-endpoint.txt

  Scenario: GET /api/v1/working-papers lists with pagination
    Tool: Bash (curl)
    Preconditions: At least 1 working paper exists
    Steps:
      1. curl -s http://localhost:8080/api/v1/working-papers?page=1&limit=10 -H "Authorization: Bearer $TOKEN"
      2. Assert HTTP 200
      3. Assert response has "data" array and "total" count
    Expected Result: Paginated list response
    Failure Indicators: 500, wrong format, missing pagination metadata
    Evidence: .sisyphus/evidence/task-13-list-endpoint.txt

  Scenario: POST /api/v1/working-papers/:id/sign — sequential signing works
    Tool: Bash (curl)
    Preconditions: Working paper created with 2 signatories, logged in as signatory #1
    Steps:
      1. curl -s -X POST http://localhost:8080/api/v1/working-papers/{id}/sign -H "Authorization: Bearer $TOKEN"
      2. Assert HTTP 200
      3. Assert response shows signatory #1 status = "signed" with qr_code_png present
      4. Assert working paper status = "signing"
    Expected Result: First signature recorded, QR generated, status updated
    Failure Indicators: 500, wrong signatory signed, no QR code, status unchanged
    Evidence: .sisyphus/evidence/task-13-sign-endpoint.txt

  Scenario: POST /api/v1/working-papers/:id/sign — wrong signatory gets 403
    Tool: Bash (curl)
    Preconditions: Working paper in signing state, logged in as signatory #2 (but #1 hasn't signed yet)
    Steps:
      1. curl -s -X POST http://localhost:8080/api/v1/working-papers/{id}/sign -H "Authorization: Bearer $TOKEN_USER2"
      2. Assert HTTP 403
      3. Assert error message indicates "not your turn" or similar
    Expected Result: 403 Forbidden with descriptive error
    Failure Indicators: 200 (signing succeeds for wrong user), 500
    Evidence: .sisyphus/evidence/task-13-sign-wrong-user.txt

  Scenario: DELETE /api/v1/working-papers/:id — only draft deletable
    Tool: Bash (curl)
    Preconditions: Working paper in signing state
    Steps:
      1. curl -s -X DELETE http://localhost:8080/api/v1/working-papers/{id} -H "Authorization: Bearer $TOKEN"
      2. Assert HTTP 409 or 400 (not 204)
    Expected Result: Delete rejected for non-draft status
    Failure Indicators: 204 (delete succeeds), 500
    Evidence: .sisyphus/evidence/task-13-delete-non-draft.txt

  Scenario: GET /api/v1/working-papers/pending-count returns correct count
    Tool: Bash (curl)
    Preconditions: User has 1 pending working paper to sign
    Steps:
      1. curl -s http://localhost:8080/api/v1/working-papers/pending-count -H "Authorization: Bearer $TOKEN"
      2. Assert HTTP 200
      3. Assert response has "count" field with value >= 1
    Expected Result: Correct pending count returned
    Failure Indicators: Count is 0 when there are pending items, 500
    Evidence: .sisyphus/evidence/task-13-pending-count.txt

  Scenario: Existing risk endpoints are unaffected
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. curl -s http://localhost:8080/api/v1/risks -H "Authorization: Bearer $TOKEN"
      2. Assert HTTP 200 with expected risk list format
      3. curl -s http://localhost:8080/api/v1/approvals -H "Authorization: Bearer $TOKEN"
      4. Assert HTTP 200 with expected approval format
    Expected Result: All existing endpoints return same format as before
    Failure Indicators: 500, changed response format, missing data
    Evidence: .sisyphus/evidence/task-13-no-breaking-changes.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(handler): add working paper HTTP handlers and routes`
  - Files: `backend/internal/handler/http/working_paper.go`, `backend/cmd/server/main.go`
  - Pre-commit: `cd backend && go build ./...`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `go vet ./...` + `go build ./...` in backend. Run `npm run build` in frontend. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify Clean Architecture boundaries (no handler importing repository directly).
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Frontend Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for UI)
  Start from clean state. Run migration. Start backend. Start frontend. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: create working paper → sign sequentially → export Excel → verify inbox. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual files created/modified. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance: no changes to approval tables, no PDF generation, no frontend QR library. Detect unplanned changes to existing files. Flag any scope creep.
  Output: `Tasks [N/N compliant] | Scope Creep [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|-----------|
| 1 | `feat(db): add working paper tables migration` | 000031*.sql | `make migrate-up` |
| 2 | `feat(domain): add working paper entity and repository interface` | entity/working_paper.go, repository/working_paper.go | `go build ./...` |
| 3 | `feat(pkg): add QR code generation and document hash utilities` | pkg/qrcode/, pkg/hash/ | `go build ./...` |
| 4 | `feat(frontend): add working paper types, API client, sidebar nav` | types/working-paper.ts, lib/api/working-papers.ts, app-navigation.ts | `npm run build` |
| 5 | `feat(repo): implement postgres working paper repository` | repository/postgres/working_paper.go | `go build ./...` |
| 6 | `feat(frontend): add working paper list page` | risk/working-papers/page.tsx | `npm run build` |
| 7 | `feat(frontend): add working paper create page with risk picker` | risk/working-papers/new/page.tsx | `npm run build` |
| 8 | `feat(frontend): add Excel export with 3 document templates` | lib/working-paper-export.ts | `npm run build` |
| 9 | `feat(frontend): add working paper detail and signing page` | risk/working-papers/[id]/page.tsx | `npm run build` |
| 10 | `feat(usecase): implement working paper CRUD usecases` | usecase/workingpaper/*.go | `go build ./...` |
| 11 | `feat(usecase): implement sequential signing with QR generation` | usecase/workingpaper/sign.go | `go build ./...` |
| 12 | `feat(frontend): integrate working paper signing into inbox` | inbox/page.tsx | `npm run build` |
| 13 | `feat(handler): add working paper HTTP handlers and routes` | handler/http/working_paper.go, cmd/server/main.go | `go build ./...` |

---

## Success Criteria

### Verification Commands
```bash
# Backend builds
cd backend && go build ./...  # Expected: no errors

# Frontend builds
cd frontend && npm run build  # Expected: no errors

# Migration applies cleanly
cd backend && make migrate-up  # Expected: success

# Working paper tables exist
psql $DATABASE_URL -c "\d working_papers"  # Expected: table columns listed
psql $DATABASE_URL -c "\d working_paper_signatories"  # Expected: table columns listed

# API responds
curl -s http://localhost:8080/api/v1/working-papers | jq '.data'  # Expected: array

# No breaking changes to existing endpoints
curl -s http://localhost:8080/api/v1/risks | jq '.data'  # Expected: unchanged response
curl -s http://localhost:8080/api/v1/approvals | jq '.data'  # Expected: unchanged response
```

### Final Checklist
- [ ] All "Must Have" present (risk snapshot, sequential signing, QR codes, 3 Excel templates, org-scoped)
- [ ] All "Must NOT Have" absent (no approval table changes, no PDF, no email notifications)
- [ ] Working paper CRUD works end-to-end
- [ ] Sequential signing enforced (out-of-order → 403)
- [ ] Excel export with 3 sheets + QR signature sheet
- [ ] Inbox shows pending signing requests
- [ ] Existing approval and risk workflows untouched
