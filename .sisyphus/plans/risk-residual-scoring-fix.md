# Remove Reviewer Dual-Scoring & Fix Residual Risk Semantics

## TL;DR

> **Quick Summary**: Remove the reviewer re-scoring mechanism (9 DB columns + all associated backend/frontend code) and redefine existing probability/impact fields as Residual Risk scores. Reviewer role changes from "re-scorer" to "validator" (approve/reject only).
> 
> **Deliverables**:
> - DB migration dropping 9 `reviewed_*` columns + 2 derived columns
> - Backend entity/usecase/repository cleanup (remove dual-score logic)
> - Frontend: delete scoring grid component, remove reviewer scoring UI, rename labels to "Residual"
> - Dashboard/reports updated to use base scores only
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (migration) → Tasks 2-5 (backend) → Tasks 6-9 (frontend) → F1-F4 (verification)

---

## Context

### Original Request
User (acting as senior risk manager) brainstormed risk assessment form compliance with ISO 31000:2018. Identified 12 gaps. User chose to fix **GAP-4 (missing Residual Risk layer)** only + remove reviewer dual-scoring. Minimal scope.

### Interview Summary
**Key Discussions**:
- Current form has dual scoring: unit fills probability/impact, reviewer re-scores. ISO 31000 says reviewer should validate, not re-score.
- User chose **Opsi B (Simplified)**: current probability/impact fields ARE residual risk (already considering existing controls). No explicit inherent scoring.
- Bobot Matrix (custom 5×5 weight) stays. Score = P × I × Weight.
- All 9 `reviewed_*` columns to be dropped (including `reviewed_by`, `reviewed_at`).
- Drop directly — accept score shift for existing approved risks. No data migration.
- No automated tests — QA by agent only.

**Research Findings**:
- ISO 31000 clause 6.4.3: risk analysis considers existing controls and their effectiveness
- 52+ code locations reference reviewer scoring across backend + frontend
- `resolveRiskScoreSemantics()` is central score resolution function used by 6+ components
- `review-scoring-grid.tsx` (186 lines) is reviewer-scoring-only component — delete entirely
- `inherent-residual-trend.tsx` compares inherent vs reviewed — becomes meaningless after change
- `working_paper.go` queries reference reviewed_* fields — missed in initial scope

### Metis Review
**Identified Gaps** (addressed):
- Migration 000027 added 9 columns, not 4 — plan now covers all 9
- Existing approved risks with different reviewed scores will shift — user accepts this
- `working_paper.go` finalized score queries — added to scope
- `inherent-residual-trend.tsx` chart breaks — will be hidden/stubbed
- `reviewed_by`/`reviewed_at` columns — user chose to drop all
- In-flight risks mid-workflow — acceptable disruption

---

## Work Objectives

### Core Objective
Remove the dual-scoring mechanism where reviewers re-score risks, and redefine the existing scoring fields as Residual Risk. Reviewer becomes validate-only (approve/reject).

### Concrete Deliverables
- Migration `000037_remove_reviewed_score_fields.up.sql` + `.down.sql`
- Updated `risk.go` entity without reviewed score fields/methods
- Updated `approval/action.go` without reviewer scoring input
- Updated `postgres/risk.go` repository with simplified score queries
- Updated `postgres/working_paper.go` with simplified score queries
- Updated `risk_score_semantics_test.go`
- Deleted `review-scoring-grid.tsx`
- Updated `types/risk.ts`, `lib/risk.ts`, `lib/risk-history.ts`, `lib/dashboard-insights.ts`
- Updated `approval-modal.tsx`, `review-side-panel.tsx`
- Updated risk register + form pages
- Hidden/stubbed `inherent-residual-trend.tsx`
- Renamed UI labels: "Probabilitas" → "Probabilitas Residual", etc.

### Definition of Done
- [ ] `cd backend && go build ./...` exits 0
- [ ] `cd backend && go test ./...` exits 0
- [ ] `cd frontend && npx tsc --noEmit` exits 0
- [ ] `cd frontend && npm run build` exits 0
- [ ] Zero `reviewed_probability`/`ReviewedProbability`/`reviewed_probability` references in codebase (except migration down file)
- [ ] Risk API responses contain no `reviewed*` fields
- [ ] Approval action succeeds without scoring fields
- [ ] Dashboard/heatmap renders using base scores

### Must Have
- All 9 `reviewed_*` columns dropped from DB + 2 derived columns (`score_change_label`, `effectiveness_label`) -> berasal dari skor versi terbaru dibanding versi sebelumnya
- Backend entity, usecase, repository cleaned of dual-score logic
- Frontend scoring grid deleted, approval modal simplified
- UI labels renamed to include "Residual"
- Dashboard/reports use base probability/impact as effective score

### Must NOT Have (Guardrails)
- **G1**: DO NOT touch `target_probability`, `target_impact`, `target_weight`, `target_nilai`, `target_score` columns
- **G2**: DO NOT change the approval workflow `step_type` enum — `review` step stays (validate-only)
- **G3**: DO NOT modify bobot matrix lookup logic — weight calculation unchanged
- **G4**: DO NOT refactor `resolveRiskScoreSemantics()` beyond removing the reviewed branch
- **G5**: DO NOT rename database columns `probability`/`impact`/`inherent_score` — only UI labels change
- **G6**: DO NOT add new inherent scoring fields (Opsi B = no explicit inherent)
- **G7**: DO NOT redesign the approval workflow UX beyond removing scoring
- **G8**: DO NOT rewrite the inherent-residual trend chart — hide/stub with TODO comment
- **G9**: Each task's commit MUST compile and app MUST start — no broken intermediate states

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Go test framework)
- **Automated tests**: NO (user decision) — only update existing failing tests
- **Framework**: Go test (backend only, update existing tests)
- **Agent QA**: Primary verification method

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Backend Build**: Use Bash — `go build ./...`, `go test ./...`
- **Frontend**: Use Bash — `npx tsc --noEmit`, `npm run build`
- **Frontend UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Codebase Sweep**: Use `ast_grep_search` — verify zero remaining references

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — DB + Backend foundation):
├── Task 1: DB migration — drop reviewed columns [quick]
├── Task 2: Backend entity — remove reviewed fields/methods from risk.go [quick]
├── Task 3: Backend usecase — remove reviewer scoring from approval action [quick]

Wave 2 (After Wave 1 — Backend repo + Frontend core):
├── Task 4: Backend repository — simplify score queries in risk.go [unspecified-high]
├── Task 5: Backend repository — update working_paper.go queries [quick]
├── Task 6: Backend tests — update risk_score_semantics_test.go [quick]
├── Task 7: Frontend types + core logic — remove reviewed fields from types & lib [unspecified-high]

Wave 3 (After Wave 2 — Frontend UI):
├── Task 8: Frontend components — delete scoring grid, update approval UI [visual-engineering]
├── Task 9: Frontend pages — update risk form, register, dashboard [visual-engineering]

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
| 1 | — | 2, 3, 4, 5 | 1 |
| 2 | 1 | 4, 6, 7 | 1 |
| 3 | 1, 2 | 4 | 1 |
| 4 | 2, 3 | 8, 9 | 2 |
| 5 | 1 | 9 | 2 |
| 6 | 2, 4 | — | 2 |
| 7 | — | 8, 9 | 2 |
| 8 | 7 | 9 | 3 |
| 9 | 7, 8 | — | 3 |
| F1-F4 | ALL | — | FINAL |

> Critical Path: T1 → T2 → T3 → T4 → T8 → T9 → F1-F4

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 4 tasks — T4 `unspecified-high`, T5 `quick`, T6 `quick`, T7 `unspecified-high`
- **Wave 3**: 2 tasks — T8 `visual-engineering`, T9 `visual-engineering`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. DB Migration — Drop All Reviewed Score Columns

  **What to do**:
  - Create migration `000037_remove_reviewed_score_fields.up.sql`:
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_probability;`
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_impact;`
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_weight;`
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_nilai;`
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_score;`
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_by;`
    - `ALTER TABLE risks DROP COLUMN IF EXISTS reviewed_at;`
  - Create corresponding `.down.sql` that restores all 9 columns with correct types (reference migration 000027 for types)
  - NO data migration — drop directly (user accepted score shift)
  - Verify next migration number is 000037 by checking existing migrations

  **Must NOT do**:
  - DO NOT touch `target_*` columns (G1)
  - DO NOT touch `probability`, `impact`, `weight`, `nilai`, `inherent_score` columns (G5)
  - DO NOT add any new columns
  - DO NOT modify any other tables

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single migration file creation, straightforward DDL
  - **Skills**: [`backend-go`]
    - `backend-go`: Go backend conventions, migration patterns
  - **Skills Evaluated but Omitted**:
    - `postgres-pro`: Not needed — simple DROP COLUMN DDL, no query optimization

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential start)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/db/migrations/000027_add_reviewed_score_fields.up.sql` — Original migration that added these 9 columns. Use `.up.sql` as reference for column names/types when writing `.down.sql`. The `.down.sql` of 000027 shows the DROP pattern.
  - `backend/db/migrations/000036_*.up.sql` — Latest migration number. New migration must be 000037.

  **External References**:
  - `backend/Makefile` — `make migrate-new name=remove_reviewed_score_fields` to create migration files

  **WHY Each Reference Matters**:
  - Migration 000027 is the source of truth for column names and types — `.down.sql` must restore them exactly as originally added

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Migration up succeeds
    Tool: Bash
    Preconditions: Database running, current at migration 000036
    Steps:
      1. Run `cd backend && make migrate-up`
      2. Run `psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='risks' AND column_name LIKE 'reviewed_%' ORDER BY column_name;"`
      3. Run `psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='risks' AND column_name IN ('score_change_label','effectiveness_label') ORDER BY column_name;"`
    Expected Result: Step 1 exits 0. Steps 2 and 3 return 0 rows.
    Failure Indicators: Any reviewed_* column still exists, migration error
    Evidence: .sisyphus/evidence/task-1-migration-up.txt

  Scenario: Migration down restores columns
    Tool: Bash
    Preconditions: Migration 000037 applied
    Steps:
      1. Run `cd backend && make migrate-down`
      2. Run `psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='risks' AND column_name LIKE 'reviewed_%' ORDER BY column_name;"`
      3. Run `cd backend && make migrate-up` (re-apply)
    Expected Result: Step 2 returns 9 rows (all reviewed_* columns restored). Step 3 succeeds.
    Failure Indicators: Missing columns after down, migration error on re-apply
    Evidence: .sisyphus/evidence/task-1-migration-down.txt
  ```

  **Commit**: YES
  - Message: `fix(db): drop reviewed score columns from risks table`
  - Files: `backend/db/migrations/000037_remove_reviewed_score_fields.up.sql`, `backend/db/migrations/000037_remove_reviewed_score_fields.down.sql`
  - Pre-commit: `make migrate-up`

- [x] 2. Backend Entity — Remove Reviewed Score Fields & Methods from Risk

  **What to do**:
  - In `backend/internal/domain/entity/risk.go`:
    - Remove struct fields: `ReviewedProbability`, `ReviewedImpact`, `ReviewedWeight`, `ReviewedNilai`, `ReviewedScore`, `ScoreChangeLabel`, `EffectivenessLabel`, `ReviewedBy`, `ReviewedAt`
    - Remove methods: `ApplyReviewerScore()`, `hasCompleteReviewedScoreBundle()`, `GetEffectiveScore()`
    - Simplify `EffectiveProbability()` → always return `r.Probability`
    - Simplify `EffectiveImpact()` → always return `r.Impact`
    - Simplify `EffectiveNilai()` → always return `r.Nilai`
    - Or remove `Effective*()` methods entirely and update callers to use base fields directly
    - Remove `GetCopyRisk()` reviewed_* field copying if present

  **Must NOT do**:
  - DO NOT touch `Target*` fields (G1)
  - DO NOT modify bobot matrix calculation methods (G3)
  - DO NOT rename `Probability`/`Impact`/`InherentScore` fields (G5)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Struct field removal + method deletion/simplification in single file
  - **Skills**: [`backend-go`]
    - `backend-go`: Go entity patterns, clean architecture conventions
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Not needed — no concurrency or advanced patterns involved

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3, after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 6, 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/internal/domain/entity/risk.go:102-180` — Risk struct definition with all reviewed_* fields
  - `backend/internal/domain/entity/risk.go:200-250` — `ApplyReviewerScore()` method
  - `backend/internal/domain/entity/risk.go:260-310` — `EffectiveProbability()`, `EffectiveImpact()`, `EffectiveNilai()`, `GetEffectiveScore()` methods
  - `backend/internal/domain/entity/risk.go:350-391` — `hasCompleteReviewedScoreBundle()` helper
  - `backend/internal/domain/entity/risk.go:1136` — `GetCopyRisk()` method that copies reviewed fields

  **API/Type References**:
  - `backend/internal/domain/entity/risk.go` — Full Risk struct is the source of truth for what fields exist

  **WHY Each Reference Matters**:
  - Lines 102-180: Know exactly which struct fields to remove
  - Lines 200-391: Know exactly which methods to remove/simplify — these are the core dual-scoring logic
  - Line 1136: GetCopyRisk copies all fields — must be updated to not copy removed fields

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Backend compiles after entity changes
    Tool: Bash
    Preconditions: Task 1 migration applied
    Steps:
      1. Run `cd backend && go build ./...`
      2. Run `cd backend && grep -r "ReviewedProbability\|ReviewedImpact\|ReviewedWeight\|ReviewedNilai\|ReviewedScore\|ScoreChangeLabel\|EffectivenessLabel\|ApplyReviewerScore\|hasCompleteReviewedScoreBundle" internal/domain/entity/risk.go`
    Expected Result: Step 1 may have compile errors (expected — downstream files reference removed fields, will be fixed in T3-T5). Step 2 returns 0 matches.
    Failure Indicators: Any reviewed_* field or method still in risk.go entity
    Evidence: .sisyphus/evidence/task-2-entity-cleanup.txt

  Scenario: Effective methods return base values
    Tool: Bash
    Preconditions: Entity updated
    Steps:
      1. Run `cd backend && grep -A3 "func.*EffectiveProbability\|func.*EffectiveImpact\|func.*EffectiveNilai" internal/domain/entity/risk.go`
    Expected Result: If methods exist, they return r.Probability, r.Impact, r.Nilai directly (no reviewed branch). Or methods are removed entirely.
    Failure Indicators: Any conditional logic checking reviewed fields
    Evidence: .sisyphus/evidence/task-2-effective-methods.txt
  ```

  **Commit**: YES (groups with T3)
  - Message: `refactor(domain): remove reviewed score fields and methods from Risk entity`
  - Files: `backend/internal/domain/entity/risk.go`
  - Pre-commit: `grep -c "ReviewedProbability" backend/internal/domain/entity/risk.go` returns 0

- [x] 3. Backend Usecase — Remove Reviewer Scoring from Approval Action

  **What to do**:
  - In `backend/internal/usecase/approval/action.go`:
    - Remove `ReviewedProbability` and `ReviewedImpact` from `ApprovalActionInput` struct
    - Remove the logic that applies reviewer scores when action is "approve" for review step
    - Keep the approve/reject flow — just remove the scoring part
    - The review step now only sets status and records the approval action
  - Check `backend/internal/handler/http/risk.go` for request parsing of reviewed_* fields — remove from request struct/parsing

  **Must NOT do**:
  - DO NOT change approval workflow step_type enum (G2)
  - DO NOT redesign the approval workflow UX (G7)
  - DO NOT remove the review step itself — it stays as validate-only

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Remove fields from input struct + delete scoring logic block
  - **Skills**: [`backend-go`]
    - `backend-go`: Go usecase patterns, clean architecture
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Not needed — straightforward field/logic removal

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/approval/action.go:42-60` — `ApprovalActionInput` struct with `ReviewedProbability`/`ReviewedImpact` fields
  - `backend/internal/usecase/approval/action.go:180-200` — Logic block that calls `risk.ApplyReviewerScore()` during approve action
  - `backend/internal/handler/http/risk.go` — HTTP handler that parses `reviewed_probability`/`reviewed_impact` from request body

  **API/Type References**:
  - `backend/internal/usecase/approval/action.go` — The ApprovalActionInput is the contract between handler and usecase

  **WHY Each Reference Matters**:
  - Lines 42-60: Input struct defines what the handler sends — removing fields here cascades to handler
  - Lines 180-200: This is the core "reviewer applies score" logic that must be deleted
  - Handler: Must stop parsing reviewed_* from HTTP request body

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Approval action input no longer accepts scoring fields
    Tool: Bash
    Preconditions: Tasks 1-2 complete
    Steps:
      1. Run `cd backend && grep -n "ReviewedProbability\|ReviewedImpact\|reviewedProbability\|reviewed_probability" internal/usecase/approval/action.go`
      2. Run `cd backend && grep -n "ReviewedProbability\|ReviewedImpact\|reviewedProbability\|reviewed_probability" internal/handler/http/risk.go`
    Expected Result: Both return 0 matches
    Failure Indicators: Any reviewed scoring reference remains
    Evidence: .sisyphus/evidence/task-3-usecase-cleanup.txt

  Scenario: Backend compiles after usecase + handler changes
    Tool: Bash
    Preconditions: Tasks 1-3 complete
    Steps:
      1. Run `cd backend && go build ./...`
    Expected Result: Exit 0 (may still fail if repo layer not updated yet — acceptable at this stage)
    Failure Indicators: Compile errors in approval package specifically
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES (groups with T2)
  - Message: `refactor(usecase): remove reviewer scoring from approval action`
  - Files: `backend/internal/usecase/approval/action.go`, `backend/internal/handler/http/risk.go`
  - Pre-commit: `go build ./cmd/...` or accept partial build

- [x] 4. Backend Repository — Simplify Score Queries in risk.go

  **What to do**:
  - In `backend/internal/repository/postgres/risk.go`:
    - Remove `finalizedProbabilityExpr()` helper — replace all usages with direct `r.probability` column reference
    - Remove `finalizedImpactExpr()` helper — replace with `r.impact`
    - Remove `finalizedScoreExpr()` helper — replace with `r.inherent_score` or `r.probability * r.impact * r.weight`
    - Update ALL SELECT statements (9+) to remove `reviewed_*` columns from select lists
    - Update INSERT query — remove reviewed_* from insert columns/values
    - Update UPDATE query — remove reviewed_* from set clauses
    - Update `Scan()` calls — remove scanning into reviewed_* fields
    - Update `HeatmapData()` query to use `r.probability` and `r.impact` directly (not finalized expressions)
    - Update `TopRisks()` query similarly
    - Update `DashboardSummary()` query similarly

  **Must NOT do**:
  - DO NOT change bobot matrix lookup logic (G3)
  - DO NOT modify `target_*` column queries (G1)
  - DO NOT refactor query structure beyond removing reviewed columns — keep existing query patterns
  - DO NOT rename `probability`/`impact`/`inherent_score` column references (G5)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 9+ SQL queries to update across a large file, high blast radius, needs careful attention
  - **Skills**: [`backend-go`, `postgres-pro`]
    - `backend-go`: Go repository patterns, pgx query conventions
    - `postgres-pro`: SQL query modification, understanding SELECT/INSERT/UPDATE patterns
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Not needed — no concurrency patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/risk.go` — Main risk repository file. Contains:
    - `finalizedProbabilityExpr()` — Helper that returns COALESCE(reviewed_probability, probability). Must be removed/simplified.
    - `finalizedImpactExpr()` — Same pattern for impact
    - `finalizedScoreExpr()` — Same pattern for score
    - 9+ SELECT statements referencing reviewed_* columns
    - INSERT/UPDATE statements including reviewed_* columns
  - `backend/db/migrations/000023_fix_score_formulas.up.sql` — Shows computed column formulas for reference
  - `backend/db/migrations/000027_add_reviewed_score_fields.up.sql` — Original column additions to know exact names

  **WHY Each Reference Matters**:
  - `risk.go` repository is the largest change — every SQL query touching the risks table must be audited
  - The finalized*Expr helpers are the core abstraction for dual-score — removing them is the key change
  - Migration files confirm exact column names to search for in queries

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Backend compiles and tests pass after repo changes
    Tool: Bash
    Preconditions: Tasks 1-3 complete, migration applied
    Steps:
      1. Run `cd backend && go build ./...`
      2. Run `cd backend && go test ./internal/repository/postgres/... -v -count=1`
    Expected Result: Step 1 exits 0. Step 2 — existing tests pass (score semantics test may fail, fixed in T6).
    Failure Indicators: Compile errors, SQL scan errors
    Evidence: .sisyphus/evidence/task-4-repo-build.txt

  Scenario: No reviewed_* references remain in risk repository
    Tool: Bash
    Preconditions: Changes applied
    Steps:
      1. Run `cd backend && grep -n "reviewed_probability\|reviewed_impact\|reviewed_weight\|reviewed_nilai\|reviewed_score\|reviewed_by\|reviewed_at\|score_change_label\|effectiveness_label\|finalizedProbabilityExpr\|finalizedImpactExpr\|finalizedScoreExpr" internal/repository/postgres/risk.go`
    Expected Result: 0 matches
    Failure Indicators: Any stale reference to reviewed columns or finalized helpers
    Evidence: .sisyphus/evidence/task-4-stale-refs.txt

  Scenario: Dashboard API returns valid data using base scores
    Tool: Bash
    Preconditions: Server running with migration applied
    Steps:
      1. Start server: `cd backend && make run &`
      2. Run `curl -s http://localhost:8080/api/v1/dashboard/summary | python3 -m json.tool`
      3. Run `curl -s http://localhost:8080/api/v1/dashboard/heatmap | python3 -m json.tool`
      4. Run `curl -s http://localhost:8080/api/v1/dashboard/top-risks | python3 -m json.tool`
    Expected Result: All 3 return valid JSON with 200 status. No null reference errors. Heatmap uses probability/impact values.
    Failure Indicators: 500 errors, JSON parse errors, null fields where scores expected
    Evidence: .sisyphus/evidence/task-4-dashboard-api.txt
  ```

  **Commit**: YES
  - Message: `refactor(repo): simplify finalized score expressions, remove reviewed columns from queries`
  - Files: `backend/internal/repository/postgres/risk.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 5. Backend Repository — Update Working Paper Queries

  **What to do**:
  - In `backend/internal/repository/postgres/working_paper.go`:
    - Lines 43-57: Update finalized score calculation to use base `probability`/`impact`/`inherent_score` instead of reviewed_* columns
    - Remove any COALESCE(reviewed_*, base) patterns — use base directly
    - Verify query still returns valid results

  **Must NOT do**:
  - DO NOT restructure working paper feature (scope creep SC2)
  - DO NOT change working paper API response shape beyond removing reviewed fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused change in single file — update SQL query references
  - **Skills**: [`backend-go`]
    - `backend-go`: Go repository patterns
  - **Skills Evaluated but Omitted**:
    - `postgres-pro`: Not needed — simple column reference change

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/working_paper.go:43-57` — Finalized score calculation using reviewed_* columns. This query computes the effective score for working papers.

  **WHY Each Reference Matters**:
  - This file was missed in the original plan scope — Metis caught it. Contains direct references to reviewed_* that will cause SQL errors after column drop.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Working paper queries compile and execute
    Tool: Bash
    Preconditions: Migration applied, Tasks 1-4 complete
    Steps:
      1. Run `cd backend && go build ./...`
      2. Run `cd backend && grep -n "reviewed_" internal/repository/postgres/working_paper.go`
    Expected Result: Step 1 exits 0. Step 2 returns 0 matches.
    Failure Indicators: Compile error, stale reviewed_* references
    Evidence: .sisyphus/evidence/task-5-working-paper.txt
  ```

  **Commit**: YES (groups with T4)
  - Message: `refactor(repo): update working paper queries to use base scores`
  - Files: `backend/internal/repository/postgres/working_paper.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 6. Backend Tests — Update Risk Score Semantics Tests

  **What to do**:
  - In `backend/internal/repository/postgres/risk_score_semantics_test.go`:
    - Remove test cases that test dual-score behavior (reviewer score overriding unit score)
    - Update remaining test cases to expect base probability/impact as effective score
    - Remove references to `ReviewedProbability`, `ReviewedImpact`, `ApplyReviewerScore`, etc.
    - Ensure tests verify: score = probability × impact × weight (single-score model)
  - Run `go test ./internal/repository/postgres/... -v` to verify all pass

  **Must NOT do**:
  - DO NOT add new test scenarios beyond what existed (scope creep SC6)
  - DO NOT refactor test structure — only update for field removal

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Update existing tests — remove/modify test cases, not writing new ones
  - **Skills**: [`backend-go`]
    - `backend-go`: Go testing patterns, table-driven tests
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Not needed for test updates

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5 — but depends on T2, T4 completing first)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 4

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/risk_score_semantics_test.go` — 4+ test locations testing dual-score semantics. Tests validate that reviewed scores override base scores — this behavior is being removed.

  **WHY Each Reference Matters**:
  - These tests will FAIL after entity changes — they test the exact behavior being removed. Must be updated to test single-score model.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All backend tests pass
    Tool: Bash
    Preconditions: Tasks 1-5 complete
    Steps:
      1. Run `cd backend && go test ./... -v -count=1 2>&1 | tail -30`
      2. Run `cd backend && grep -c "ReviewedProbability\|ApplyReviewerScore\|hasCompleteReviewedScoreBundle" internal/repository/postgres/risk_score_semantics_test.go`
    Expected Result: Step 1 — all tests pass, exit 0. Step 2 returns 0.
    Failure Indicators: Test failures, stale references to reviewed scoring
    Evidence: .sisyphus/evidence/task-6-tests.txt
  ```

  **Commit**: YES
  - Message: `test: update risk score semantics tests for single-score model`
  - Files: `backend/internal/repository/postgres/risk_score_semantics_test.go`
  - Pre-commit: `cd backend && go test ./internal/repository/postgres/... -v`

- [x] 7. Frontend Types + Core Logic — Remove Reviewed Fields from Types & Lib

  **What to do**:
  - In `frontend/src/types/risk.ts`:
    - Remove all `reviewed*` fields from Risk interfaces (3 interfaces affected)
    - Remove `scoreChangeLabel`, `effectivenessLabel` fields
    - Remove `reviewedBy`, `reviewedAt` fields
  - In `frontend/src/lib/risk.ts`:
    - Simplify `resolveRiskScoreSemantics()` (lines 260-309) — remove the reviewed branch, always return base probability/impact/nilai
    - Remove `hasCompleteReviewedRiskScoreBundle()` function entirely
    - Keep the function signature if callers depend on it — just simplify the body
  - In `frontend/src/lib/risk-history.ts`:
    - Lines 23-27, 58-62: Remove reviewed_* field references from history display logic
  - In `frontend/src/lib/api/risk-register.ts`:
    - Lines 27-31: Remove reviewed_* from API response type mapping
  - In `frontend/src/lib/dashboard-insights.ts`:
    - Lines 20-24, 122-126: Remove reviewed_* from insight calculations
    - Lines 387-397: `buildInherentResidualTrendData()` — simplify or stub. Since inherent = residual now, either return empty data or remove the comparison logic. Add `// TODO: GAP-4 follow-up — chart needs redesign` comment.

  **Must NOT do**:
  - DO NOT refactor `resolveRiskScoreSemantics()` beyond removing the reviewed branch (G4)
  - DO NOT rewrite dashboard-insights engine (scope creep SC4)
  - DO NOT modify target_* type fields

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple files across types/lib layer, core logic changes affecting many downstream components
  - **Skills**: [`react-expert`]
    - `react-expert`: TypeScript type patterns, React lib conventions
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not UI work — type/logic layer only
    - `vercel-react-best-practices`: Not performance-related

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent of backend Tasks 4-6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: None (frontend types can be updated independently)

  **References**:

  **Pattern References**:
  - `frontend/src/types/risk.ts` — 3 interfaces with reviewed_* fields. Source of truth for frontend Risk type.
  - `frontend/src/lib/risk.ts:260-309` — `resolveRiskScoreSemantics()` — central score resolution. Branches on `hasCompleteReviewedRiskScoreBundle()`. After change: always return base score.
  - `frontend/src/lib/risk.ts` — `hasCompleteReviewedRiskScoreBundle()` — validation function checking if all reviewed fields are present. DELETE entirely.
  - `frontend/src/lib/risk-history.ts:23-27, 58-62` — History display references reviewed_* for version comparison
  - `frontend/src/lib/api/risk-register.ts:27-31` — API response mapping includes reviewed fields
  - `frontend/src/lib/dashboard-insights.ts:20-24, 122-126, 387-397` — Insight calculations + trend builder using reviewed data

  **WHY Each Reference Matters**:
  - `types/risk.ts`: Removing type fields will cause TypeScript errors in ALL consuming components — this is intentional, errors guide what needs updating in T8-T9
  - `resolveRiskScoreSemantics()`: This is THE central function — used by risk register table, top-risks panel, approval modal, review panel. Simplifying it cascades to all consumers.
  - `dashboard-insights.ts:387-397`: `buildInherentResidualTrendData()` compares inherent vs reviewed — becomes meaningless, must be stubbed

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation passes for types and lib layer
    Tool: Bash
    Preconditions: Type changes applied
    Steps:
      1. Run `cd frontend && npx tsc --noEmit 2>&1 | head -50`
    Expected Result: May show errors in COMPONENT files (expected — fixed in T8-T9). But types/risk.ts, lib/risk.ts, lib/risk-history.ts, lib/api/risk-register.ts, lib/dashboard-insights.ts should have NO errors.
    Failure Indicators: Type errors within the lib/types layer itself
    Evidence: .sisyphus/evidence/task-7-tsc.txt

  Scenario: No reviewed references in types/lib files
    Tool: Bash
    Preconditions: Changes applied
    Steps:
      1. Run `cd frontend && grep -rn "reviewed\|ReviewedProbability\|ReviewedImpact\|ReviewedWeight\|ReviewedNilai\|reviewedScore\|scoreChangeLabel\|effectivenessLabel\|hasCompleteReviewedRiskScoreBundle" src/types/risk.ts src/lib/risk.ts src/lib/risk-history.ts src/lib/api/risk-register.ts src/lib/dashboard-insights.ts`
    Expected Result: 0 matches (except TODO comments)
    Failure Indicators: Any stale reviewed_* reference
    Evidence: .sisyphus/evidence/task-7-stale-refs.txt
  ```

  **Commit**: YES
  - Message: `refactor(frontend): remove reviewed score types, resolution logic, and dashboard insights`
  - Files: `frontend/src/types/risk.ts`, `frontend/src/lib/risk.ts`, `frontend/src/lib/risk-history.ts`, `frontend/src/lib/api/risk-register.ts`, `frontend/src/lib/dashboard-insights.ts`
  - Pre-commit: `cd frontend && npx tsc --noEmit` (may have downstream errors)

- [x] 8. Frontend Components — Delete Scoring Grid, Update Approval UI

  **What to do**:
  - **DELETE** `frontend/src/components/shared/review-scoring-grid.tsx` entirely (186 lines) — only used for reviewer scoring
  - In `frontend/src/components/shared/approval-modal.tsx`:
    - Lines 45-85: Remove reviewer scoring state/form fields
    - Lines 102-103: Remove scoring grid import
    - Lines 165: Remove scoring grid render
    - Keep approve/reject buttons and comments field — just remove scoring UI
  - In `frontend/src/components/shared/review-side-panel.tsx`:
    - Lines 67-97: Remove reviewed score display section
    - Lines 166-216: Remove scoring comparison grid
    - Lines 243-245: Remove reviewed score summary
    - Keep the review panel for showing risk details — just remove the "Skor Penilaian" parts
  - In `frontend/src/app/(app)/risk/register/new/page.tsx`:
    - Lines 519-522: Remove reviewed_* from form default values if present
    - Lines 774-779: Remove "Skor Penilaian Reviewer" section from form UI
    - Lines 2351-2439: Remove any reviewer scoring display in form view mode
  - In `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`:
    - Line 88+: Either hide the chart entirely with a `// TODO: redesign after GAP-4` comment, or simplify to show only residual trend without comparison

  **Must NOT do**:
  - DO NOT redesign approval modal UX beyond removing scoring (G7, SC5)
  - DO NOT refactor review-side-panel beyond removing reviewed display (SC5)
  - DO NOT rewrite inherent-residual trend chart (G8, SC1)
  - DO NOT modify ReviewScoringGrid for reuse — DELETE it

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component changes, need to ensure visual integrity after removing sections
  - **Skills**: [`react-expert`]
    - `react-expert`: React component patterns, JSX manipulation
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not creating new designs — removing existing UI
    - `shadcn`: Not modifying shadcn components

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T7 types)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `frontend/src/components/shared/review-scoring-grid.tsx` — ENTIRE FILE (186 lines). Reviewer-only scoring grid component. DELETE.
  - `frontend/src/components/shared/approval-modal.tsx:45-85, 102-103, 165` — Reviewer scoring form state, scoring grid import, scoring grid render
  - `frontend/src/components/shared/review-side-panel.tsx:67-97, 166-216, 243-245` — Reviewed score display, comparison grid, summary
  - `frontend/src/app/(app)/risk/register/new/page.tsx:519-522, 774-779, 2351-2439` — Form default values, "Skor Penilaian Reviewer" section, form view mode display
  - `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx:88+` — Inherent vs Reviewed trend chart

  **WHY Each Reference Matters**:
  - `review-scoring-grid.tsx`: This is a 186-line component used ONLY for reviewer scoring — deleting it removes a major piece of the dual-score UI
  - `approval-modal.tsx`: This is what the reviewer sees when approving — scoring grid must be removed but approve/reject must remain
  - `review-side-panel.tsx`: Shows reviewed vs unit scores side-by-side — the comparison sections must go
  - `new/page.tsx`: The risk form itself may display reviewer scores in view mode — must be cleaned
  - `inherent-residual-trend.tsx`: This chart breaks when reviewed fields are gone — must be hidden/stubbed

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Review scoring grid file deleted
    Tool: Bash
    Preconditions: File exists before task
    Steps:
      1. Run `ls frontend/src/components/shared/review-scoring-grid.tsx 2>&1`
      2. Run `cd frontend && grep -rn "review-scoring-grid\|ReviewScoringGrid" src/`
    Expected Result: Step 1 — file not found. Step 2 — 0 matches (no imports remain).
    Failure Indicators: File still exists, or stale imports reference it
    Evidence: .sisyphus/evidence/task-8-scoring-grid-deleted.txt

  Scenario: TypeScript compilation passes
    Tool: Bash
    Preconditions: Tasks 7-8 complete
    Steps:
      1. Run `cd frontend && npx tsc --noEmit`
    Expected Result: Exit 0, no TypeScript errors
    Failure Indicators: Type errors referencing reviewed fields or deleted component
    Evidence: .sisyphus/evidence/task-8-tsc.txt

  Scenario: Approval modal does not show scoring grid (Playwright)
    Tool: Playwright
    Preconditions: Frontend running at localhost:3000, logged in as reviewer, risk in "review" status
    Steps:
      1. Navigate to risk register page
      2. Find a risk with status "in_review"
      3. Click to open approval/review action
      4. Assert: NO element with text "Skor Penilaian Reviewer" exists
      5. Assert: Approve and Reject buttons ARE visible
      6. Screenshot the modal
    Expected Result: Modal shows approve/reject only, no scoring grid
    Failure Indicators: Scoring grid visible, "Skor Penilaian" text present
    Evidence: .sisyphus/evidence/task-8-approval-modal-no-scoring.png
  ```

  **Commit**: YES
  - Message: `refactor(frontend): remove reviewer scoring UI from approval modal and review panel`
  - Files: DELETE `frontend/src/components/shared/review-scoring-grid.tsx`, EDIT `approval-modal.tsx`, `review-side-panel.tsx`, `new/page.tsx`, `inherent-residual-trend.tsx`
  - Pre-commit: `cd frontend && npx tsc --noEmit`

- [x] 9. Frontend Pages — Update Risk Register, Dashboard, Rename Labels to "Residual"

  **What to do**:
  - In `frontend/src/app/(app)/risk/register/page.tsx`:
    - Lines 207-225: Update risk register table to display base probability/impact score (remove reviewed score column or logic)
    - Ensure score column uses `resolveRiskScoreSemantics()` which now always returns base score
  - In `frontend/src/app/(app)/dashboard/overview/top-risks-panel.tsx`:
    - Lines 18-23, 74-78: Remove reviewed_* field references, use base score
  - **Rename UI labels** across the form and display:
    - "Probabilitas" → "Probabilitas Residual" (in form Section 2: Analisis Risiko)
    - "Dampak" → "Dampak Residual" (in form Section 2)
    - "Skor Risiko" → "Skor Risiko Residual" (where score is displayed)
    - Remove any "Skor Sementara" / "Skor Penilaian" labeling distinction — there's only one score now
    - Search for Indonesian labels: "Skor Sementara", "Skor Penilaian", "Skor Resmi", "Hasil Penilaian Reviewer" — remove or rename
  - In `frontend/src/app/(app)/risk/register/new/page.tsx`:
    - Update Section 2 (Analisis Risiko) labels to include "Residual"
    - Ensure the section explains: "Nilai probabilitas dan dampak sudah mempertimbangkan kontrol yang ada (residual risk)"

  **Must NOT do**:
  - DO NOT rename JavaScript/TypeScript variable names (probability stays as `probability` in code)
  - DO NOT change form field names in Zod schema (G5)
  - DO NOT modify target section labels — target stays "Target Penurunan"
  - DO NOT add new form sections or fields

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Label changes and UI cleanup across multiple pages — need design awareness
  - **Skills**: [`react-expert`]
    - `react-expert`: React component patterns, form handling
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not creating new designs
    - `clarify`: Labels are predetermined, not UX copywriting

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T7 types + T8 components)
  - **Parallel Group**: Wave 3 (after T8)
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 8

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx:207-225` — Risk register table score display logic
  - `frontend/src/app/(app)/dashboard/overview/top-risks-panel.tsx:18-23, 74-78` — Top risks panel score display
  - `frontend/src/app/(app)/risk/register/new/page.tsx:346-409` — Zod schema (DO NOT modify field names)
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — Section 2 (Analisis Risiko) label JSX — search for "Probabilitas", "Dampak", "Skor"

  **WHY Each Reference Matters**:
  - `register/page.tsx`: Risk register table is the primary list view — must show correct score without reviewed logic
  - `top-risks-panel.tsx`: Dashboard widget showing highest risks — must use base score
  - `new/page.tsx` labels: This is where "Residual" labeling is introduced — the key user-facing semantic change

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Frontend builds successfully
    Tool: Bash
    Preconditions: Tasks 7-8 complete
    Steps:
      1. Run `cd frontend && npm run build`
    Expected Result: Exit 0, production build succeeds
    Failure Indicators: Build errors, TypeScript errors
    Evidence: .sisyphus/evidence/task-9-build.txt

  Scenario: Risk form labels include "Residual" (Playwright)
    Tool: Playwright
    Preconditions: Frontend running at localhost:3000, logged in
    Steps:
      1. Navigate to `/risk/register/new`
      2. Expand Section 2 (Analisis Risiko)
      3. Assert: text "Residual" appears in probability label area
      4. Assert: text "Residual" appears in impact label area
      5. Assert: NO text "Skor Penilaian" or "Skor Sementara" visible anywhere on page
      6. Screenshot the form Section 2
    Expected Result: Labels show "Probabilitas Residual", "Dampak Residual". No dual-score labeling.
    Failure Indicators: Old labels "Skor Sementara" / "Skor Penilaian" still visible
    Evidence: .sisyphus/evidence/task-9-form-labels.png

  Scenario: Zero stale reviewed references in entire frontend (codebase sweep)
    Tool: Bash
    Preconditions: All frontend tasks complete
    Steps:
      1. Run `cd frontend && grep -rn "reviewedProbability\|ReviewedProbability\|reviewed_probability\|reviewedImpact\|ReviewedImpact\|reviewed_impact\|reviewedWeight\|reviewedNilai\|ReviewedScore\|reviewedScore\|scoreChangeLabel\|effectivenessLabel\|hasCompleteReviewedRiskScoreBundle\|ReviewScoringGrid\|review-scoring-grid" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"`
    Expected Result: 0 matches
    Failure Indicators: Any stale reference to reviewed scoring in frontend source
    Evidence: .sisyphus/evidence/task-9-codebase-sweep.txt

  Scenario: Risk register table shows correct scores (Playwright)
    Tool: Playwright
    Preconditions: Frontend running, risks exist in database
    Steps:
      1. Navigate to `/risk/register`
      2. Assert: table renders without JS errors (check console)
      3. Assert: score column shows numeric values (not null/undefined)
      4. Screenshot the register table
    Expected Result: Table renders with valid scores using base probability/impact
    Failure Indicators: Empty score cells, NaN, console errors about reviewed fields
    Evidence: .sisyphus/evidence/task-9-register-table.png
  ```

  **Commit**: YES
  - Message: `refactor(frontend): update dashboard, register, and rename labels to Residual`
  - Files: `frontend/src/app/(app)/risk/register/page.tsx`, `frontend/src/app/(app)/dashboard/overview/top-risks-panel.tsx`, `frontend/src/app/(app)/risk/register/new/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `go build ./...` + `go test ./...` + `npx tsc --noEmit` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction. Use `ast_grep_search` for `reviewedProbability` / `ReviewedProbability` / `reviewed_probability` — must find 0 matches (except migration down file).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Stale refs [N] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: create risk → submit for approval → reviewer approves without scoring → check dashboard. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Verification |
|---|---------|-------|-------------|
| C1 | `fix(db): drop reviewed score columns from risks table` | `backend/db/migrations/000037_*` | `make migrate-up` succeeds |
| C2 | `refactor(domain): remove reviewed score fields and methods from Risk entity` | `backend/internal/domain/entity/risk.go` | `go build ./...` passes |
| C3 | `refactor(usecase): remove reviewer scoring from approval action` | `backend/internal/usecase/approval/action.go` | `go build ./...` passes |
| C4 | `refactor(repo): simplify finalized score expressions, remove reviewed columns from queries` | `backend/internal/repository/postgres/risk.go`, `backend/internal/repository/postgres/working_paper.go` | `go build ./... && go test ./...` passes |
| C5 | `test: update risk score semantics tests for single-score model` | `backend/internal/repository/postgres/risk_score_semantics_test.go` | `go test ./internal/repository/postgres/...` passes |
| C6 | `refactor(frontend): remove reviewed score types, resolution logic, and scoring grid` | `frontend/src/types/risk.ts`, `frontend/src/lib/risk.ts`, `frontend/src/lib/risk-history.ts`, `frontend/src/lib/api/risk-register.ts`, `frontend/src/lib/dashboard-insights.ts`, `frontend/src/components/shared/review-scoring-grid.tsx` | `npx tsc --noEmit` passes |
| C7 | `refactor(frontend): remove reviewer scoring UI from approval modal and review panel` | `frontend/src/components/shared/approval-modal.tsx`, `frontend/src/components/shared/review-side-panel.tsx`, `frontend/src/app/(app)/risk/register/new/page.tsx`, `frontend/src/app/(app)/risk/register/page.tsx` | `npx tsc --noEmit` passes |
| C8 | `refactor(frontend): update dashboard, reports, and rename labels to Residual` | `frontend/src/app/(app)/dashboard/overview/top-risks-panel.tsx`, `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`, risk form label changes | `npm run build` passes |

---

## Success Criteria

### Verification Commands
```bash
cd backend && go build ./...           # Expected: exit 0
cd backend && go test ./...            # Expected: exit 0, all tests pass
cd frontend && npx tsc --noEmit        # Expected: exit 0
cd frontend && npm run build           # Expected: exit 0
```

### Codebase Sweep (Zero Stale References)
```bash
# ast_grep_search for these patterns — expect 0 matches (except migration .down.sql):
# - reviewedProbability / ReviewedProbability
# - reviewedImpact / ReviewedImpact  
# - reviewedWeight / ReviewedWeight
# - reviewedNilai / ReviewedNilai
# - reviewed_probability / reviewed_impact / reviewed_weight / reviewed_nilai
# - reviewed_score / score_change_label / effectiveness_label
# - reviewed_by / reviewed_at (in risks table context)
# - ApplyReviewerScore / hasCompleteReviewedScoreBundle / hasCompleteReviewedRiskScoreBundle
# - ReviewScoringGrid / review-scoring-grid
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All Go tests pass
- [ ] Frontend builds without errors
- [ ] Dashboard renders with base scores
- [ ] Approval workflow works without scoring
- [ ] Zero stale reviewer references in codebase
