# Reassessment Flow Refactor — 3-Status Model

## TL;DR

> **Quick Summary**: Remove the separate "Pemantauan Risiko" menu, embed reassessment entry points into the risk register, and collapse 5 risk statuses down to 3 (`assessment_draft` → `assessment_in_review` → `approved`). Aligned with Singapore/UK/USA government best practices.
> 
> **Deliverables**:
> - DB migration renaming statuses + data migration for existing rows
> - Backend status constants, validation, approval workflow, usecases updated
> - Frontend: sidebar menu removed, reassess button on register table, status badges updated
> - Redirect from old `/risk/assessment` URL to `/risk/register`
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (migration) → Task 2 (domain constants) → Tasks 3-5 (backend parallel) → Tasks 6-9 (frontend parallel)

---

## Context

### Original Request
User wants to refactor the reassessment flow: remove "Pemantauan Risiko" as a separate menu, make reassessment accessible from risk register table rows and risk detail page, and simplify all risk statuses from 5 to 3.

### Interview Summary
**Key Discussions**:
- Status scope: ALL risks (new + reassessment) use new 3-status model
- Entry point: Reassess button on risk register table rows (approved risks only)
- Rejection: Returns to `assessment_draft`, no separate `rejected` status
- Forms: Reuse existing assessment form components (HasilPemantauanCard, ProfilRisikoCard, SimpulanCard)

**Research Findings**:
- Singapore (WOG IM8), UK (Orange Book), USA (NIST RMF) all embed reassessment in risk register — no separate menu
- UK "Under Review → Published" pattern closely matches this approach
- All countries: continuous + event-driven reassessment, not periodic-only

### Metis Review
**Identified Gaps** (addressed):
- 2-step approval coexists with 3 statuses: Keep `approval_steps` table for internal tracking, expose single `assessment_in_review` status externally
- In-flight data migration: Map `draft`→`assessment_draft`, `in_review`+`in_approval`→`assessment_in_review`, `rejected`→`assessment_draft`, `approved` stays
- Assessment form route: Keep `/risk/assessment/[id]` form, only remove list page `/risk/assessment/page.tsx`
- Bookmarked URL redirect: Add redirect from `/risk/assessment` → `/risk/register`
- Legacy `"reviewed"` status check in `reassess.go:104`: Clean up
- Audit logs: Historical entries keep old status names (fine), UI should handle gracefully
- Dashboard queries: Update `in_approval` → `assessment_in_review` in dashboard filters

---

## Work Objectives

### Core Objective
Collapse the 5-status risk lifecycle into a 3-status model and move reassessment entry points into the risk register, eliminating the standalone monitoring menu.

### Concrete Deliverables
- New DB migration: rename statuses + data migration
- Updated Go domain constants and validation methods
- Updated approval workflow (reviewer approve stays `assessment_in_review`, final step → `approved`, reject → `assessment_draft`)
- Updated risk usecases and repository queries
- Frontend type/status updates
- Sidebar menu item removed, route redirect added
- Risk register table shows reassess button for approved risks
- Assessment form and review panel use new status values

### Definition of Done
- [ ] `go build ./...` passes with zero errors
- [ ] `go test ./...` passes with zero failures
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `SELECT DISTINCT status FROM risks` returns only `(assessment_draft, assessment_in_review, approved)`
- [ ] Sidebar has no "Pemantauan Risiko" menu item
- [ ] `/risk/assessment` redirects to `/risk/register`
- [ ] Reassess button visible on approved risk rows in register table

### Must Have
- All risk statuses renamed: `draft`→`assessment_draft`, `in_review`+`in_approval`→`assessment_in_review`, drop `rejected`
- Data migration for existing rows
- 2-step approval preserved internally via `approval_steps`
- Reassess button on risk register table for approved+current risks
- Existing assessment form components reused (not rewritten)

### Must NOT Have (Guardrails)
- DO NOT merge assessment form into `register/new/page.tsx` (3,172 lines — too large)
- DO NOT change `approval_requests`, `approval_steps`, `approval_histories` table structure
- DO NOT change scoring/calculation logic (`getBobot()`, `calculateNilai()`, `getRiskLevelFromNilai()`)
- DO NOT refactor any file beyond status string changes (no "while we're here" cleanups)
- DO NOT touch incident status flow
- DO NOT rename `approved` status (it's stable, used in working papers)
- DO NOT consolidate API client files or "improve" approval stepper UI

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Go testing, frontend build)
- **Automated tests**: YES (TDD — update test expectations first, then implementation)
- **Framework**: Go `testing` package (backend), `npm run build` (frontend)

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: `go build ./...`, `go test ./...`, `psql` queries
- **Frontend**: `npm run build`, `ast_grep_search` for status string verification
- **API**: `curl` requests to verify endpoints

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — sequential, 2 tasks):
├── Task 1: DB migration (rename statuses + data migration) [quick]
└── Task 2: Go domain constants + validation methods (depends: 1) [quick]

Wave 2 (Backend parallel — after Task 2):
├── Task 3: Approval workflow update (depends: 2) [unspecified-high]
├── Task 4: Risk usecases + repository update (depends: 2) [unspecified-high]
└── Task 5: Legacy cleanup + dashboard queries (depends: 2) [quick]

Wave 3 (Frontend parallel — after Wave 2):
├── Task 6: Frontend types + status constants (depends: 2) [quick]
├── Task 7: Remove assessment list page + sidebar + redirect (depends: 6) [quick]
├── Task 8: Risk register table reassess button + status badges (depends: 6) [quick]
└── Task 9: Assessment form + review panel status updates (depends: 6) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2 | 1 |
| 2 | 1 | 3, 4, 5, 6 | 1 |
| 3 | 2 | F1-F4 | 2 |
| 4 | 2 | F1-F4 | 2 |
| 5 | 2 | F1-F4 | 2 |
| 6 | 2 | 7, 8, 9 | 3 |
| 7 | 6 | F1-F4 | 3 |
| 8 | 6 | F1-F4 | 3 |
| 9 | 6 | F1-F4 | 3 |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `quick`, T2 → `quick`
- **Wave 2**: 3 tasks — T3 → `unspecified-high`, T4 → `unspecified-high`, T5 → `quick`
- **Wave 3**: 4 tasks — T6-T9 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. DB Migration: Rename Risk Statuses

  **What to do**:
  - Create migration file `000030_rename_risk_statuses.up.sql` and `.down.sql`
  - Rename status values: `draft`→`assessment_draft`, `in_review`→`assessment_in_review`, `in_approval`→`assessment_in_review`, `rejected`→`assessment_draft`
  - Update CHECK constraint on `risks.status` to only allow `(assessment_draft, assessment_in_review, approved)`
  - Also update `risk_versions.status` if it has a similar constraint
  - Data migration: UPDATE existing rows to new status values BEFORE changing constraint
  - Down migration: reverse the mapping

  **Must NOT do**:
  - DO NOT change any table structure (columns, indexes, foreign keys)
  - DO NOT touch `approval_requests`, `approval_steps`, `approval_histories` tables

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`postgres-pro`]
    - `postgres-pro`: PostgreSQL migration patterns, constraint management

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential start)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `backend/db/migrations/000029_risk_status_in_review_in_approval.up.sql` — Previous status migration pattern (data update + constraint change). Follow this exact pattern.
  - `backend/db/migrations/000001_initial_schema.up.sql` — Original CHECK constraint definition for `risks.status`
  - `backend/db/migrations/000007_risk_versioning.up.sql` — Risk versioning schema (check if `risk_versions` table has status constraint)
  - `backend/Makefile` — Migration commands: `make migrate-new name=rename_risk_statuses`, `make migrate-up`, `make migrate-down`

  **Acceptance Criteria**:
  ```
  Scenario: Migration applies and statuses are correct
    Tool: Bash
    Preconditions: Backend DB running, previous migrations applied
    Steps:
      1. Run `cd backend && make migrate-up`
      2. Run `psql $DATABASE_URL -c "SELECT DISTINCT status FROM risks ORDER BY status;"`
      3. Assert output contains ONLY: assessment_draft, assessment_in_review, approved
      4. Run `psql $DATABASE_URL -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='risks'::regclass AND conname LIKE '%status%';"`
      5. Assert constraint allows ONLY (assessment_draft, assessment_in_review, approved)
    Expected Result: Only 3 valid statuses exist, constraint enforces them
    Evidence: .sisyphus/evidence/task-1-migration-apply.txt

  Scenario: Migration rollback works
    Tool: Bash
    Preconditions: Migration 000030 applied
    Steps:
      1. Run `cd backend && make migrate-down`
      2. Run `psql $DATABASE_URL -c "SELECT DISTINCT status FROM risks ORDER BY status;"`
      3. Assert output contains old statuses: approved, draft, in_approval, in_review (and possibly rejected)
      4. Run `cd backend && make migrate-up` (re-apply)
    Expected Result: Rollback restores old statuses, re-apply works cleanly
    Evidence: .sisyphus/evidence/task-1-migration-rollback.txt
  ```

  **Commit**: YES
  - Message: `chore(db): migrate risk statuses to 3-status model`
  - Files: `backend/db/migrations/000030_rename_risk_statuses.up.sql`, `backend/db/migrations/000030_rename_risk_statuses.down.sql`
  - Pre-commit: `cd backend && make migrate-up && make migrate-down && make migrate-up`

- [x] 2. Go Domain Constants + Validation Methods

  **What to do**:
  - Update `risk.go` status constants: rename `RiskStatusDraft`→value `"assessment_draft"`, `RiskStatusInReview`→value `"assessment_in_review"`, remove `RiskStatusInApproval` and `RiskStatusRejected`
  - Update `IsLocked()`: return true for `assessment_in_review` and `approved` only
  - Update `CanBeSubmittedForApproval()`: return true for `assessment_draft` only
  - Update `CanBeReassessed()`: return true for `approved` only
  - Update `ValidRiskStatuses` slice/map if it exists
  - Update ALL tests in `risk_test.go` FIRST (TDD: red), then update implementation (green)
  - Use `lsp_find_references` on each old constant to find all Go usages — list them for Tasks 3-5

  **Must NOT do**:
  - DO NOT update usecases/handlers/repository in this task (that's Tasks 3-5)
  - DO NOT change any non-status-related domain logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`backend-go`]
    - `backend-go`: Go clean architecture patterns, domain entity conventions

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: Task 1

  **References**:
  - `backend/internal/domain/entity/risk.go` — Current status constants (`RiskStatusDraft = "draft"`, `RiskStatusInReview = "in_review"`, `RiskStatusInApproval = "in_approval"`, `RiskStatusApproved = "approved"`, `RiskStatusRejected = "rejected"`), `IsLocked()`, `CanBeSubmittedForApproval()`, `CanBeReassessed()` methods
  - `backend/internal/domain/entity/risk_test.go` — Existing tests for status validation methods (update FIRST for TDD)
  - `backend/internal/domain/entity/approval.go` — May reference risk status constants for workflow transitions

  **Acceptance Criteria**:
  ```
  Scenario: Domain constants compile and tests pass
    Tool: Bash
    Preconditions: Migration from Task 1 applied
    Steps:
      1. Run `cd backend && go build ./internal/domain/entity/`
      2. Assert: zero errors
      3. Run `cd backend && go test ./internal/domain/entity/ -v`
      4. Assert: all tests pass, including updated status tests
    Expected Result: Domain package compiles and all entity tests pass
    Evidence: .sisyphus/evidence/task-2-domain-tests.txt

  Scenario: Old constants no longer exist
    Tool: Bash
    Preconditions: Task 2 implementation complete
    Steps:
      1. Use ast_grep_search for `RiskStatusInApproval` in Go files under backend/
      2. Use ast_grep_search for `RiskStatusRejected` in Go files under backend/
      3. Assert: only found in other files (usecases/handlers) that will be fixed in Tasks 3-5, NOT in domain/entity/
    Expected Result: Domain entity no longer defines removed constants
    Evidence: .sisyphus/evidence/task-2-old-constants-check.txt
  ```

  **Commit**: YES
  - Message: `refactor(backend): rename risk status constants and validation`
  - Files: `backend/internal/domain/entity/risk.go`, `backend/internal/domain/entity/risk_test.go`
  - Pre-commit: `cd backend && go test ./internal/domain/entity/`

- [x] 3. Update Approval Workflow for 3-Status Model

  **What to do**:
  - Update `approval/action.go`: when reviewer approves, status stays `assessment_in_review` (not change to `in_approval`); when final step (pimpinan) approves → `approved`; reject at any step → `assessment_draft`
  - Update `approval/submit.go`: submitting changes status from `assessment_draft` → `assessment_in_review`
  - Remove any references to `RiskStatusInApproval` and `RiskStatusRejected` from approval files
  - Update tests in `action_test.go` and `submit_test.go` FIRST (TDD), then implementation
  - The `approval_steps` table still tracks 2 steps internally — only the external risk.status changes

  **Must NOT do**:
  - DO NOT change `approval_requests`, `approval_steps`, `approval_histories` table structure
  - DO NOT change the 2-step approval mechanism itself

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture usecase patterns, approval workflow logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:
  - `backend/internal/usecase/approval/action.go` — `ExecuteApprovalActionUseCase` — handles approve/reject actions. Line ~91 sets status on rejection. Reviewer approve changes `in_review`→`in_approval` (CHANGE: stay `assessment_in_review`). Final approve → `approved`.
  - `backend/internal/usecase/approval/action_test.go` — Tests for approval actions (update expectations FIRST)
  - `backend/internal/usecase/approval/submit.go` — `SubmitForApprovalUseCase` — changes `draft`→`in_review` (CHANGE: `assessment_draft`→`assessment_in_review`)
  - `backend/internal/usecase/approval/submit_test.go` — Tests for submit flow
  - `backend/internal/domain/entity/approval.go` — Approval entity definitions
  - `backend/internal/domain/entity/risk.go` — Updated constants from Task 2

  **Acceptance Criteria**:
  ```
  Scenario: Approval workflow tests pass with new statuses
    Tool: Bash
    Preconditions: Task 2 complete (new domain constants)
    Steps:
      1. Run `cd backend && go test ./internal/usecase/approval/ -v`
      2. Assert: all tests pass
      3. Verify test cases cover: submit (draft→in_review), reviewer approve (stays in_review), pimpinan approve (→approved), reject (→assessment_draft)
    Expected Result: All approval tests pass with 3-status model
    Evidence: .sisyphus/evidence/task-3-approval-tests.txt

  Scenario: No references to old approval-related statuses
    Tool: Bash
    Preconditions: Task 3 complete
    Steps:
      1. Run `grep -n 'InApproval\|StatusRejected' backend/internal/usecase/approval/*.go`
      2. Assert: zero matches
    Expected Result: No old status references in approval usecase
    Evidence: .sisyphus/evidence/task-3-old-refs-check.txt
  ```

  **Commit**: YES
  - Message: `refactor(backend): update approval workflow for 3-status model`
  - Files: `backend/internal/usecase/approval/action.go`, `backend/internal/usecase/approval/action_test.go`, `backend/internal/usecase/approval/submit.go`, `backend/internal/usecase/approval/submit_test.go`
  - Pre-commit: `cd backend && go test ./internal/usecase/approval/`

- [x] 4. Update Risk Usecases + Repository for New Statuses

  **What to do**:
  - Update `reassess.go`: change status checks to use new constants, remove legacy `"reviewed"` check at line ~104
  - Update `create.go`: new risks start as `assessment_draft` (not `draft`)
  - Update `update.go`: status transition validation uses new constants
  - Update `repository/postgres/risk.go`: any SQL queries with hardcoded status strings
  - Update `dashboard_phase2.go` (or equivalent): dashboard queries that filter by `in_approval` → use `assessment_in_review`
  - Update ALL corresponding test files FIRST (TDD)

  **Must NOT do**:
  - DO NOT change scoring logic (`getBobot`, `calculateNilai`, `getRiskLevelFromNilai`)
  - DO NOT refactor repository beyond status string changes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`]
    - `backend-go`: Go usecase patterns, repository query updates

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:
  - `backend/internal/usecase/risk/reassess.go` — `CreateRiskReassessmentUseCase`. Line ~104 checks for deprecated `"reviewed"` status (REMOVE). Uses `CanBeReassessed()` which is updated in Task 2.
  - `backend/internal/usecase/risk/reassess_test.go` — Tests for reassessment (update FIRST)
  - `backend/internal/usecase/risk/create.go` — Sets initial status to `draft` (CHANGE to `assessment_draft`)
  - `backend/internal/usecase/risk/create_test.go` — Tests for risk creation
  - `backend/internal/usecase/risk/update.go` — Status transition logic
  - `backend/internal/usecase/risk/update_test.go` — Tests for risk update
  - `backend/internal/repository/postgres/risk.go` — SQL queries that may hardcode status strings
  - `backend/internal/usecase/risk/dashboard_phase2.go` — Dashboard summary/heatmap queries filtering by status
  - `backend/internal/handler/http/risk.go` — HTTP handlers that reference status values (update status string params)

  **Acceptance Criteria**:
  ```
  Scenario: All risk usecase tests pass
    Tool: Bash
    Preconditions: Tasks 1-2 complete
    Steps:
      1. Run `cd backend && go test ./internal/usecase/risk/ -v`
      2. Assert: all tests pass
      3. Run `cd backend && go test ./internal/repository/... -v`
      4. Assert: all repository tests pass
    Expected Result: All risk-related backend tests pass
    Evidence: .sisyphus/evidence/task-4-risk-tests.txt

  Scenario: No hardcoded old status strings in risk usecase/repo
    Tool: Bash
    Preconditions: Task 4 complete
    Steps:
      1. Run `grep -rn '"draft"\|"in_review"\|"in_approval"\|"rejected"\|"reviewed"' backend/internal/usecase/risk/ backend/internal/repository/postgres/risk.go --include="*.go"`
      2. Assert: zero matches (excluding test fixture comments if any)
    Expected Result: No old status string literals remain
    Evidence: .sisyphus/evidence/task-4-old-strings-check.txt
  ```

  **Commit**: YES
  - Message: `refactor(backend): update risk usecases and repository`
  - Files: `backend/internal/usecase/risk/*.go`, `backend/internal/repository/postgres/risk.go`, `backend/internal/handler/http/risk.go`
  - Pre-commit: `cd backend && go test ./internal/usecase/risk/ ./internal/repository/...`

- [x] 5. Backend Full Integration Verification

  **What to do**:
  - Run `go build ./...` to verify entire backend compiles with no errors
  - Run `go test ./...` to verify ALL tests pass (not just individual packages)
  - Fix any remaining compilation errors from removed constants (`RiskStatusInApproval`, `RiskStatusRejected`) in files not covered by Tasks 2-4 (e.g., `handler/http/risk.go`, `pdfreport/`, `workingpaper/`)
  - Search entire backend for any remaining references to old status strings and fix them

  **Must NOT do**:
  - DO NOT refactor anything — only fix compilation errors from removed constants

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`backend-go`]
    - `backend-go`: Go compilation error fixing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4) — can start after Task 2, fixes stragglers
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:
  - `backend/internal/handler/http/risk.go` — HTTP handlers (existing LSP errors + status refs)
  - `backend/internal/usecase/risk/pdfreport/` — PDF report generation, may reference status labels
  - `backend/internal/usecase/risk/workingpaper/` — Working paper logic, references `RiskStatusApproved` (should be fine since `approved` unchanged)
  - `backend/internal/domain/entity/risk.go` — Source of truth for new constants (from Task 2)

  **Acceptance Criteria**:
  ```
  Scenario: Entire backend compiles and tests pass
    Tool: Bash
    Preconditions: Tasks 2-4 complete
    Steps:
      1. Run `cd backend && go build ./...`
      2. Assert: zero compilation errors
      3. Run `cd backend && go test ./... 2>&1`
      4. Assert: all tests pass, zero failures
    Expected Result: Full backend build + test suite green
    Evidence: .sisyphus/evidence/task-5-full-backend.txt

  Scenario: No old risk status references anywhere in backend
    Tool: Bash
    Preconditions: Task 5 complete
    Steps:
      1. Run `grep -rn 'RiskStatusInApproval\|RiskStatusRejected' backend/internal/ --include="*.go"`
      2. Assert: zero matches
      3. Run `grep -rn '"in_approval"\|"rejected"' backend/internal/ --include="*.go" | grep -v migration | grep -v _test.go`
      4. Assert: zero matches in non-test, non-migration Go files
    Expected Result: Codebase fully migrated to 3-status model
    Evidence: .sisyphus/evidence/task-5-status-sweep.txt
  ```

  **Commit**: YES (groups with Tasks 3-4 if minimal changes, otherwise separate)
  - Message: `refactor(backend): clean up remaining old status references`
  - Files: Any remaining files with old status refs
  - Pre-commit: `cd backend && go build ./... && go test ./...`

- [x] 6. Frontend Types + Status Constants

  **What to do**:
  - Update `types/risk.ts`: change `RiskStatus` type to `"assessment_draft" | "assessment_in_review" | "approved"`
  - Update `lib/risk.ts`: status label mappings, color mappings, badge variants for new status values
  - Update any status-related utility functions (e.g., `getRiskStatusLabel()`, `getRiskStatusColor()`)
  - Search all `.ts`/`.tsx` files for old status string literals and update

  **Must NOT do**:
  - DO NOT change scoring functions (`getBobot`, `calculateNilai`, `getRiskLevelFromNilai`)
  - DO NOT refactor component structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-expert`]
    - `react-expert`: TypeScript type updates, React component type flow

  **Parallelization**:
  - **Can Run In Parallel**: NO (other frontend tasks depend on this)
  - **Parallel Group**: Wave 3 (first frontend task)
  - **Blocks**: Tasks 7, 8, 9
  - **Blocked By**: Task 2 (needs to know final status names)

  **References**:
  - `frontend/src/types/risk.ts` — `RiskStatus` type definition, Risk interface with `status` field
  - `frontend/src/lib/risk.ts` — Status label mapping (Indonesian labels like "Draf", "Dalam Review"), color mapping for badges, utility functions
  - `frontend/src/lib/api/risks.ts` — API client that handles risk responses with status field
  - `frontend/src/lib/api/risk-assessment.ts` — Assessment-specific API client

  **Acceptance Criteria**:
  ```
  Scenario: Frontend types compile with new statuses
    Tool: Bash
    Preconditions: None (type changes are self-contained)
    Steps:
      1. Run `cd frontend && npx tsc --noEmit 2>&1 | head -50`
      2. Note errors (some expected — components using old statuses will be fixed in Tasks 7-9)
      3. Verify `types/risk.ts` has correct RiskStatus type
    Expected Result: Type file itself is correct; downstream errors expected and tracked
    Evidence: .sisyphus/evidence/task-6-types-check.txt

  Scenario: No old status strings in type/lib files
    Tool: Bash
    Preconditions: Task 6 complete
    Steps:
      1. Run `grep -n '"draft"\|"in_review"\|"in_approval"\|"rejected"' frontend/src/types/risk.ts frontend/src/lib/risk.ts`
      2. Assert: zero matches
    Expected Result: Core type files fully migrated
    Evidence: .sisyphus/evidence/task-6-old-strings.txt
  ```

  **Commit**: YES
  - Message: `refactor(frontend): update risk types and status constants`
  - Files: `frontend/src/types/risk.ts`, `frontend/src/lib/risk.ts`
  - Pre-commit: `grep -c '"in_approval"\|"rejected"' frontend/src/types/risk.ts frontend/src/lib/risk.ts` (should be 0)

- [x] 7. Remove Assessment List Page + Sidebar Menu + Add Redirect

  **What to do**:
  - Remove "Pemantauan Risiko" menu item from `app-navigation.ts` (the entry pointing to `/risk/assessment`)
  - Delete or empty `/risk/assessment/page.tsx` (the LIST page only — keep the `[id]` form page)
  - Add redirect: `/risk/assessment` → `/risk/register` (via Next.js middleware or route redirect)
  - Keep `/risk/assessment/[id]/page.tsx` intact (the assessment FORM is still used)
  - Keep all components in `/risk/assessment/components/` intact (reused by form)

  **Must NOT do**:
  - DO NOT delete `/risk/assessment/[id]/page.tsx` (the form page)
  - DO NOT delete `/risk/assessment/components/` (reused components)
  - DO NOT modify sidebar component beyond removing the menu item

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-expert`]
    - `react-expert`: Next.js App Router routing, middleware redirects

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 6

  **References**:
  - `frontend/src/lib/app-navigation.ts` — Contains navigation items including "Pemantauan Risiko" at `/risk/assessment`. Remove this item.
  - `frontend/src/app/(app)/risk/assessment/page.tsx` — Assessment LIST page (DELETE or replace with redirect)
  - `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — Assessment FORM page (KEEP — this is the reassessment form)
  - `frontend/src/app/(app)/risk/assessment/components/` — Shared components (HasilPemantauanCard, ProfilRisikoCard, SimpulanCard) — KEEP
  - `frontend/src/components/app-sidebar.tsx` — Renders navigation from `app-navigation.ts`
  - `frontend/next.config.ts` — Can add redirects here for `/risk/assessment` → `/risk/register`

  **Acceptance Criteria**:
  ```
  Scenario: Sidebar no longer shows Pemantauan Risiko
    Tool: Bash
    Preconditions: Task 7 complete
    Steps:
      1. Run `grep -rn 'Pemantauan\|/risk/assessment' frontend/src/lib/app-navigation.ts`
      2. Assert: zero matches (menu item removed)
      3. Run `grep -rn '/risk/assessment' frontend/src/components/app-sidebar.tsx`
      4. Assert: zero matches
    Expected Result: No navigation references to old assessment route
    Evidence: .sisyphus/evidence/task-7-sidebar-check.txt

  Scenario: Old URL redirects properly
    Tool: Bash
    Preconditions: Task 7 complete, `npm run build` passes
    Steps:
      1. Check `next.config.ts` or middleware for redirect rule `/risk/assessment` → `/risk/register`
      2. Verify redirect is permanent (308) or temporary (307)
    Expected Result: Redirect configured for bookmarked URLs
    Evidence: .sisyphus/evidence/task-7-redirect-check.txt
  ```

  **Commit**: YES
  - Message: `refactor(frontend): remove assessment menu and add redirect`
  - Files: `frontend/src/lib/app-navigation.ts`, `frontend/src/app/(app)/risk/assessment/page.tsx`, `frontend/next.config.ts`
  - Pre-commit: `cd frontend && npm run build`

- [x] 8. Risk Register Table: Status Badges + Reassess Button

  **What to do**:
  - Update status badges in risk register table (`register/page.tsx`) to use new status values and labels
  - Ensure "Reassess" button is visible on rows where `status === "approved" && is_current === true`
  - Update any status filter dropdowns to show new 3 status options
  - Update status-related conditional rendering (e.g., action buttons that depend on status)

  **Must NOT do**:
  - DO NOT refactor the register page beyond status updates
  - DO NOT add new columns or significantly change table layout

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-expert`]
    - `react-expert`: React table component updates, conditional rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 6

  **References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — Risk register table with status badges and action buttons. Already has "Reassessment" button — verify it links to assessment form and only shows for approved risks.
  - `frontend/src/lib/risk.ts` — Status label/color mappings (updated in Task 6)
  - `frontend/src/types/risk.ts` — RiskStatus type (updated in Task 6)
  - `frontend/src/app/(app)/risk/register/[id]/page.tsx` — Risk detail page — may also need reassess entry point

  **Acceptance Criteria**:
  ```
  Scenario: Register page builds with new statuses
    Tool: Bash
    Preconditions: Task 6 complete
    Steps:
      1. Run `cd frontend && npm run build`
      2. Assert: zero errors related to register/page.tsx
      3. Run `grep -n '"draft"\|"in_review"\|"in_approval"\|"rejected"' frontend/src/app/\(app\)/risk/register/page.tsx`
      4. Assert: zero matches
    Expected Result: Register page uses new status values only
    Evidence: .sisyphus/evidence/task-8-register-build.txt

  Scenario: Reassess button conditional is correct
    Tool: Bash
    Preconditions: Task 8 complete
    Steps:
      1. Run `grep -A5 -B5 'reassess\|Reassess\|REASSESS' frontend/src/app/\(app\)/risk/register/page.tsx`
      2. Verify button condition checks for `status === "approved"` (or equivalent)
    Expected Result: Reassess button only shows for approved risks
    Evidence: .sisyphus/evidence/task-8-reassess-button.txt
  ```

  **Commit**: YES
  - Message: `refactor(frontend): update register table statuses and reassess button`
  - Files: `frontend/src/app/(app)/risk/register/page.tsx`, `frontend/src/app/(app)/risk/register/[id]/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 9. Assessment Form + Review Panel Status Updates

  **What to do**:
  - Update `/risk/assessment/[id]/page.tsx`: status checks, conditional rendering, submit/save logic to use new status values
  - Update `review-side-panel.tsx` (or equivalent approval review component): status labels, step indicators, action buttons
  - Update any inbox/approval list pages that show risk status
  - Verify `HasilPemantauanCard`, `ProfilRisikoCard`, `SimpulanCard` don't hardcode old statuses (they likely use props, so should be fine)
  - Run `npm run build` to verify entire frontend compiles

  **Must NOT do**:
  - DO NOT rewrite assessment form logic
  - DO NOT change form field structure or validation
  - DO NOT modify scoring/calculation components

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-expert`]
    - `react-expert`: React form components, status-driven UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 6

  **References**:
  - `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — Assessment form page. Status-dependent rendering (edit mode vs read-only based on status). Submit button triggers status change.
  - `frontend/src/app/(app)/risk/assessment/components/hasil-pemantauan-card.tsx` — Monitoring results card (verify no hardcoded statuses)
  - `frontend/src/app/(app)/risk/assessment/components/profil-risiko-card.tsx` — Risk profile card (verify no hardcoded statuses)
  - `frontend/src/app/(app)/inbox/page.tsx` — Inbox/approval list showing risk statuses
  - `frontend/src/app/(app)/inbox/[id]/page.tsx` — Approval detail with review panel
  - `frontend/src/components/review-side-panel.tsx` — Review/approval side panel (if exists) showing status stepper

  **Acceptance Criteria**:
  ```
  Scenario: Full frontend builds cleanly
    Tool: Bash
    Preconditions: Tasks 6-8 complete
    Steps:
      1. Run `cd frontend && npm run build`
      2. Assert: zero errors, zero warnings related to status types
    Expected Result: Entire frontend builds successfully
    Evidence: .sisyphus/evidence/task-9-full-build.txt

  Scenario: No old status strings anywhere in frontend
    Tool: Bash
    Preconditions: Task 9 complete
    Steps:
      1. Run `grep -rn '"draft"\|"in_review"\|"in_approval"\|"rejected"' frontend/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v '.next'`
      2. Assert: zero matches (no old status strings in any frontend source file)
    Expected Result: Frontend fully migrated to 3-status model
    Evidence: .sisyphus/evidence/task-9-status-sweep.txt
  ```

  **Commit**: YES
  - Message: `refactor(frontend): update assessment form and review panel statuses`
  - Files: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`, inbox pages, review panel
  - Pre-commit: `cd frontend && npm run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `go build ./...` + `go test ./...` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check no old status strings remain (`"draft"`, `"in_review"`, `"in_approval"`, `"rejected"` as risk statuses).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Old Status Refs [0/N found] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for UI)
  Start from clean state. Test: sidebar has no "Pemantauan Risiko", `/risk/assessment` redirects, risk register shows reassess button on approved rows, status badges show correct labels, submit → review → approve flow works end-to-end with new statuses.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| # | Message | Key Files | Pre-commit Check |
|---|---------|-----------|-----------------|
| 1 | `chore(db): migrate risk statuses to 3-status model` | `backend/db/migrations/000030_*` | `make migrate-up && make migrate-down && make migrate-up` |
| 2 | `refactor(backend): rename risk status constants and validation` | `backend/internal/domain/entity/risk.go` + tests | `go test ./internal/domain/entity/` |
| 3 | `refactor(backend): update approval workflow for 3-status model` | `approval/action.go`, `approval/submit.go` + tests | `go test ./internal/usecase/approval/` |
| 4 | `refactor(backend): update risk usecases and repository` | `reassess.go`, `create.go`, `update.go`, `risk.go` repo + tests | `go test ./internal/usecase/risk/ ./internal/repository/...` |
| 5 | `refactor(backend): clean up legacy status refs and dashboard queries` | `reassess.go`, `dashboard_phase2.go` | `go test ./...` |
| 6 | `refactor(frontend): update risk types and status constants` | `types/risk.ts`, `lib/risk.ts` | `npm run build` |
| 7 | `refactor(frontend): remove assessment menu and add redirect` | `app-navigation.ts`, `assessment/page.tsx`, middleware | `npm run build` |
| 8 | `refactor(frontend): update register table statuses and reassess button` | `register/page.tsx` | `npm run build` |
| 9 | `refactor(frontend): update assessment form and review panel statuses` | `assessment/[id]/page.tsx`, `review-side-panel.tsx` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Backend compiles
cd backend && go build ./...

# Backend tests pass
cd backend && go test ./...

# Frontend builds
cd frontend && npm run build

# DB statuses correct
psql $DATABASE_URL -c "SELECT DISTINCT status FROM risks;"
# Expected: assessment_draft, assessment_in_review, approved

# DB constraint correct
psql $DATABASE_URL -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='risks'::regclass AND conname LIKE '%status%';"
# Expected: CHECK constraint with (assessment_draft, assessment_in_review, approved)

# Old route redirects
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/risk/assessment
# Expected: 307

# No old status strings in Go code (excluding migrations and test fixtures)
grep -r '"draft"' backend/internal/ --include="*.go" | grep -v _test.go | grep -v migrations
# Expected: no matches for risk status context

# No old status strings in frontend (excluding node_modules)
grep -r '"in_review"\|"in_approval"\|"rejected"' frontend/src/ --include="*.ts" --include="*.tsx"
# Expected: no matches
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All backend tests pass
- [ ] Frontend builds cleanly
- [ ] DB migration reversible
- [ ] No old status strings remain in codebase
