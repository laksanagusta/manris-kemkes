# Reviewed Score as Canonical Final Risk Score

## TL;DR
> **Summary**: Align backend and frontend so every primary/final risk score surface uses reviewed/effective score semantics, while inherent score remains only as secondary comparison/history. Update matrix/heatmap placement for reviewed risks to use reviewed probability/impact so visuals match the final score.
> **Deliverables**:
> - Canonical backend score + reviewed matrix semantics
> - Updated query/read-model consumers across dashboard/register/report/export paths
> - Frontend helper and page alignment for primary vs secondary score display
> - Regression tests for approved, pending, fallback, sorting, counting, export, and heatmap behavior
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2/3 → 4/5 → 6/7/8 → 9 → 10

## Context
### Original Request
Ubah seluruh komponen/fungsi terkait skor risiko agar skor final risiko memakai `reviewed_score`, bukan skor inherit/inherent yang hanya mewakili penilaian awal unit pengaju review. Perubahan harus menyeluruh agar tidak ada penggunaan lama yang tertinggal.

### Interview Summary
- Primary/final risk score must be `reviewed_score` / effective score semantics.
- `inherent` score may remain only as a secondary comparison/historical value.
- Heatmap/matrix placement for reviewed risks must switch to reviewed probability/impact so visual placement matches the final score.
- Scope includes backend and frontend score consumers, including dashboard, register, history, reports, exports, and review-related views.

### Metis Review (gaps addressed)
- Preserve target/residual semantics; do not overwrite `targetScore` meaning.
- Status-gate final score semantics so pending/in-review data does not leak into finalized surfaces.
- Treat approved records with missing reviewed fields via explicit compatibility fallback in canonical helpers, and lock that behavior with characterization tests.
- Avoid UI-only/manual verification claims because no browser QA harness exists.

## Work Objectives
### Core Objective
Make reviewed/effective score the single canonical definition of “final risk score” across backend and frontend read paths, while preserving inherent score only for historical/comparison contexts and updating reviewed heatmap placement to reviewed probability/impact.

### Deliverables
- Backend canonical helper coverage for final score and final matrix position
- Repository/query updates for score-driven sorting, filtering, counts, summaries, and snapshots
- Frontend shared helper centralization for final score semantics
- Updated dashboard, register, history, review, trend, and export consumers
- Automated regression coverage and evidence outputs

### Definition of Done (verifiable conditions with commands)
- Backend domain/usecase semantics pass: `cd backend && go test ./internal/domain/entity ./internal/usecase/approval ./internal/usecase/risk -v`
- Backend repository/report/pdf semantics pass: `cd backend && go test ./internal/repository/postgres ./internal/usecase/report ./internal/service/pdfreport -v`
- Frontend semantic libs pass: `cd frontend && npm run test -- --runInBand`
- Frontend safety gates pass: `cd frontend && npm run lint && npm run build`
- No primary score surface ranks or labels approved risks by `inherentScore` when reviewed data exists.
- Inherent score remains visible only as a secondary comparison/historical value where intentionally retained.

### Must Have
- One canonical backend rule for final score + final matrix position
- Status-aware semantics: approved/finalized records use reviewed values; non-finalized records do not leak candidate review values into final summaries
- Compatibility fallback for approved legacy records missing reviewed values, locked by tests
- Frontend primary labels and ranking/counting use final/effective values consistently

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No schema migration/backfill unless implementation proves absolutely required after code-path alignment
- No redesign of charts, colors, or review UX beyond score semantics and reviewed matrix placement
- No changes to target/residual semantics or terminology beyond preserving them clearly
- No duplicate score formulas spread across frontend pages; centralize in shared helpers
- No manual-only verification steps

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with characterization-first for touched score paths
- QA policy: Every task includes agent-executed happy-path and edge/failure scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Browser note: no active Playwright/browser harness exists; verification uses Go tests, frontend unit tests, lint, and build commands only

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: 1) canonical backend semantics, 2) repository score queries, 3) reviewed matrix semantics, 5) frontend shared helpers
Wave 2: 4) backend reports/PDF/cycle compare, 6) frontend overview/dashboard, 7) frontend register/history/review, 8) frontend trends/exports
Wave 3: 9) regression/fallback sweep, 10) full verification and evidence collation

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | none | 2, 3, 5, 9 |
| 2 | 1 | 4, 6, 7, 8 |
| 3 | 1 | 4, 6, 8 |
| 4 | 2, 3 | 9, 10 |
| 5 | 1 | 6, 7, 8 |
| 6 | 2, 3, 5 | 9, 10 |
| 7 | 2, 5 | 9, 10 |
| 8 | 2, 3, 5 | 9, 10 |
| 9 | 4, 6, 7, 8 | 10 |
| 10 | 4, 6, 7, 8, 9 | Final Verification |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → unspecified-high, quick
- Wave 2 → 4 tasks → unspecified-high, writing
- Wave 3 → 2 tasks → unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Canonicalize backend final score semantics

  **What to do**: Lock the canonical backend rule in `backend/internal/domain/entity/risk.go` so finalized/approved risks resolve primary score from reviewed values, while approved legacy records without reviewed fields fall back to inherent values for compatibility. Add characterization tests covering score, level, probability, and impact selection rules, plus explicit non-finalized behavior.
  **Must NOT do**: Do not change database schema, approval statuses, or target/residual calculations.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-cutting backend semantic contract with regression risk
  - Skills: [`backend-go`, `golang-pro`] - clean architecture and table-driven Go testing patterns
  - Omitted: [`api-designer`] - no API redesign required

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 5, 9 | Blocked By: none

  **References**:
  - Pattern: `backend/internal/domain/entity/risk.go` - existing `InherentScore`, `ReviewedScore`, and effective score helpers
  - Pattern: `backend/internal/usecase/approval/action.go` - activation path for reviewed values becoming final
  - Test: `backend/internal/domain/entity/risk_test.go` - score math and risk-level testing style
  - Test: `backend/internal/usecase/risk/reassess_test.go` - review/reassessment semantics to preserve

  **Acceptance Criteria**:
  - [ ] `cd backend && go test ./internal/domain/entity ./internal/usecase/approval ./internal/usecase/risk -v` exits 0
  - [ ] Added tests prove finalized risks prefer reviewed score/probability/impact when present
  - [ ] Added tests prove non-finalized risks keep inherent score/probability/impact as primary
  - [ ] Added tests prove approved legacy records missing reviewed values fall back consistently without changing target/residual outputs

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Finalized risk uses reviewed values
    Tool: Bash
    Steps: cd backend && go test ./internal/domain/entity -run 'TestRisk.*Effective|TestRisk.*Reviewed' -v | tee ../.sisyphus/evidence/task-1-canonical-backend.txt
    Expected: PASS output shows reviewed score/probability/impact cases succeeding for finalized status fixtures
    Evidence: .sisyphus/evidence/task-1-canonical-backend.txt

  Scenario: Legacy finalized record falls back safely
    Tool: Bash
    Steps: cd backend && go test ./internal/usecase/approval ./internal/usecase/risk -run 'Test.*Fallback|Test.*Legacy|Test.*Approved' -v | tee ../.sisyphus/evidence/task-1-canonical-backend-fallback.txt
    Expected: PASS output shows approved fixtures with missing reviewed fields resolve via compatibility fallback and do not leak review semantics into non-finalized fixtures
    Evidence: .sisyphus/evidence/task-1-canonical-backend-fallback.txt
  ```

  **Commit**: YES | Message: `test/refactor(backend): characterize and enforce final score semantics` | Files: `backend/internal/domain/entity/risk.go`, `backend/internal/domain/entity/risk_test.go`, `backend/internal/usecase/approval/action.go`, `backend/internal/usecase/risk/reassess_test.go`

- [x] 2. Switch backend score-driven repository queries to canonical final score

  **What to do**: Update `backend/internal/repository/postgres/risk.go` so dashboard summaries, top risks, review queues, approved lists, cycle snapshots, score filters, sorts, and score-band aggregations use canonical final score semantics rather than direct `inherent_score` reads where the business intent is final/current score. Keep inherent values only where comparison/history columns explicitly require them.
  **Must NOT do**: Do not change columns whose purpose is explicitly target/residual or historical comparison.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: dense SQL/read-model work with many hidden coupling points
  - Skills: [`backend-go`, `postgres-pro`] - repository and SQL semantics
  - Omitted: [`microservices-architect`] - no service-boundary change

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4, 6, 7, 8 | Blocked By: 1

  **References**:
  - Pattern: `backend/internal/repository/postgres/risk.go` - primary query hotspot for score-based readers
  - Pattern: `backend/internal/domain/entity/report.go` - score bands and report summary structures to preserve
  - Pattern: `backend/internal/domain/entity/risk_compare_detail.go` - comparison structures that may retain inherent as secondary
  - Test: `backend/internal/usecase/risk/create_batch_test.go` - score persistence expectations around inherent/target

  **Acceptance Criteria**:
  - [ ] `cd backend && go test ./internal/repository/postgres ./internal/usecase/risk -v` exits 0
  - [ ] Score-based ordering/counting/filtering tests reflect reviewed/effective values for finalized records
  - [ ] Historical/comparison payloads still expose inherent as a secondary field where needed
  - [ ] No query intended for final/current score still ranks finalized risks by raw `inherent_score`

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Top risks and summaries rank by final score
    Tool: Bash
    Steps: cd backend && go test ./internal/repository/postgres ./internal/usecase/risk -run 'Test.*TopRisk|Test.*Summary|Test.*List|Test.*Snapshot' -v | tee ../.sisyphus/evidence/task-2-repository-final-score.txt
    Expected: PASS output confirms finalized fixtures sort/count by reviewed/effective values and pending fixtures still use inherent values
    Evidence: .sisyphus/evidence/task-2-repository-final-score.txt

  Scenario: Historical fields remain secondary only
    Tool: Bash
    Steps: cd backend && go test ./internal/repository/postgres -run 'Test.*Compare|Test.*History|Test.*Inherent' -v | tee ../.sisyphus/evidence/task-2-repository-history.txt
    Expected: PASS output confirms inherent fields remain available only in explicit comparison/history payloads and target/residual values are unchanged
    Evidence: .sisyphus/evidence/task-2-repository-history.txt
  ```

  **Commit**: YES | Message: `refactor(backend): switch score-driven queries to canonical final score` | Files: `backend/internal/repository/postgres/risk.go`, touched repository tests/fixtures

- [x] 3. Align backend heatmap and matrix position semantics with reviewed values

  **What to do**: Update backend heatmap and related movement logic so finalized risks use reviewed probability/impact for matrix cell placement and movement comparisons. Ensure the score-driven and matrix-driven views stay internally consistent for reviewed risks.
  **Must NOT do**: Do not redesign heatmap color palette, matrix dimensions, or non-score chart styling.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: coupled risk-matrix logic across repository/usecase/pdf layers
  - Skills: [`backend-go`] - backend testable logic changes
  - Omitted: [`frontend-design`] - no UI redesign involved

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 6, 8 | Blocked By: 1

  **References**:
  - Pattern: `backend/internal/usecase/risk/dashboard_phase2.go` - dashboard movement and alert logic
  - Pattern: `backend/internal/service/pdfreport/heatmap.go` - PDF heatmap cell/risk rendering
  - Pattern: `backend/internal/repository/postgres/risk.go` - heatmap data sourcing and velocity readers
  - Test: `backend/internal/domain/entity/risk_test.go` - probability/impact-derived level assertions to extend

  **Acceptance Criteria**:
  - [ ] `cd backend && go test ./internal/repository/postgres ./internal/usecase/risk ./internal/service/pdfreport -v` exits 0
  - [ ] Finalized heatmap fixtures land in reviewed probability/impact cells
  - [ ] Non-finalized fixtures remain in inherent probability/impact cells
  - [ ] Heatmap movement/velocity tests remain consistent with final score semantics

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Finalized risk heatmap placement uses reviewed matrix inputs
    Tool: Bash
    Steps: cd backend && go test ./internal/repository/postgres ./internal/usecase/risk -run 'Test.*Heatmap|Test.*Velocity|Test.*Matrix' -v | tee ../.sisyphus/evidence/task-3-heatmap-reviewed-placement.txt
    Expected: PASS output confirms finalized fixtures move to reviewed probability/impact cells and velocity comparisons match reviewed placement
    Evidence: .sisyphus/evidence/task-3-heatmap-reviewed-placement.txt

  Scenario: Preliminary risks keep inherent matrix inputs
    Tool: Bash
    Steps: cd backend && go test ./internal/repository/postgres ./internal/usecase/risk -run 'Test.*Heatmap|Test.*Pending|Test.*Review' -v | tee ../.sisyphus/evidence/task-3-heatmap-preliminary.txt
    Expected: PASS output confirms pending/in-review fixtures do not leak reviewed matrix coordinates into final dashboards
    Evidence: .sisyphus/evidence/task-3-heatmap-preliminary.txt
  ```

  **Commit**: YES | Message: `fix(backend): align heatmap placement with reviewed final matrix values` | Files: `backend/internal/repository/postgres/risk.go`, `backend/internal/usecase/risk/dashboard_phase2.go`, `backend/internal/service/pdfreport/heatmap.go`, touched tests

- [x] 4. Align backend reports, PDF output, and cycle comparison payloads

  **What to do**: Update report generation, PDF rendering, and cycle comparison/detail payloads so primary/final score fields use reviewed/effective semantics, while inherent remains secondary comparison context. Ensure compare/report movement logic does not mix inherent on one side and reviewed on the other.
  **Must NOT do**: Do not rename business concepts beyond clarifying final vs secondary score presentation in existing outputs.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: mixed report/export/read-model behavior with regression-sensitive outputs
  - Skills: [`backend-go`, `writing`] - backend reporting logic and output wording precision
  - Omitted: [`pptx`] - no slide output involved

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10 | Blocked By: 2, 3

  **References**:
  - Pattern: `backend/internal/usecase/report/generate.go` - report sorting, KPI counts, and trend aggregation
  - Pattern: `backend/internal/service/pdfreport/renderer.go` - PDF risk register/top-risks tables
  - Pattern: `backend/internal/domain/entity/report.go` - report DTO semantics and score bands
  - Pattern: `backend/internal/usecase/risk/compare_cycle_detail.go` - cycle detail comparisons to keep coherent

  **Acceptance Criteria**:
  - [ ] `cd backend && go test ./internal/usecase/report ./internal/service/pdfreport ./internal/usecase/risk -v` exits 0
  - [ ] Report/PDF primary score columns use reviewed/effective values for finalized risks
  - [ ] Comparison outputs retain inherent only as secondary comparison/history where intended
  - [ ] Trend and movement outputs do not accidentally alter target/residual semantics

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Reports and PDF render final score consistently
    Tool: Bash
    Steps: cd backend && go test ./internal/usecase/report ./internal/service/pdfreport -run 'Test.*Score|Test.*Trend|Test.*PDF|Test.*TopRisk' -v | tee ../.sisyphus/evidence/task-4-report-pdf-final-score.txt
    Expected: PASS output confirms finalized report rows and PDF fixtures use reviewed/effective values as primary
    Evidence: .sisyphus/evidence/task-4-report-pdf-final-score.txt

  Scenario: Cycle comparisons preserve secondary inherent context
    Tool: Bash
    Steps: cd backend && go test ./internal/usecase/risk -run 'Test.*Compare|Test.*Cycle|Test.*History' -v | tee ../.sisyphus/evidence/task-4-cycle-compare.txt
    Expected: PASS output confirms comparison payloads keep inherent as comparison-only and do not regress target/residual movement behavior
    Evidence: .sisyphus/evidence/task-4-cycle-compare.txt
  ```

  **Commit**: YES | Message: `fix(backend): align reports and cycle comparisons with final reviewed score` | Files: `backend/internal/usecase/report/generate.go`, `backend/internal/service/pdfreport/renderer.go`, `backend/internal/domain/entity/report.go`, `backend/internal/usecase/risk/compare_cycle_detail.go`, touched tests

- [x] 5. Centralize frontend final score and final matrix helpers

  **What to do**: Consolidate frontend canonical helpers so pages/libs derive primary score, level, and matrix inputs from one shared final/effective helper instead of reading `inherentScore` directly. Make helper behavior status-aware and preserve inherent as secondary comparison data only.
  **Must NOT do**: Do not re-implement score formulas separately in pages; do not change API shapes unless already supported by existing fields.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: shared helper semantics affect many frontend consumers
  - Skills: [`react-expert`, `vercel-react-best-practices`] - TypeScript helper consistency and safe consumer reuse
  - Omitted: [`frontend-design`] - no visual redesign required

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6, 7, 8 | Blocked By: 1

  **References**:
  - Pattern: `frontend/src/types/risk.ts` - canonical risk shape with inherent/reviewed fields
  - Pattern: `frontend/src/lib/risk.ts` - existing score/level helper home
  - Pattern: `frontend/src/components/shared/review-scoring-grid.tsx` - reviewed score preview semantics
  - Test: `frontend/src/lib/dashboard-insights.test.ts` - frontend score aggregation test style

  **Acceptance Criteria**:
  - [ ] `cd frontend && npm run test -- --runInBand` exits 0
  - [ ] Shared helpers expose one primary final score path for finalized risks and one secondary inherent comparison path
  - [ ] Shared helpers expose final probability/impact accessors for reviewed matrix placement
  - [ ] Falsy/undefined reviewed values are handled explicitly rather than by accidental fallback

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Frontend shared helpers resolve final values consistently
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand src/lib/dashboard-insights.test.ts src/lib/risk-report-trend.test.ts | tee ../.sisyphus/evidence/task-5-frontend-helpers.txt
    Expected: PASS output confirms finalized fixtures use reviewed/effective values while non-finalized fixtures keep inherent values
    Evidence: .sisyphus/evidence/task-5-frontend-helpers.txt

  Scenario: Missing reviewed fields do not break helper behavior
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand src/lib/risk-cycle-detail-export.test.ts | tee ../.sisyphus/evidence/task-5-frontend-helper-fallback.txt
    Expected: PASS output confirms explicit fallback behavior for legacy approved records and no accidental falsy handling regressions
    Evidence: .sisyphus/evidence/task-5-frontend-helper-fallback.txt
  ```

  **Commit**: YES | Message: `refactor(frontend): centralize final score semantics in shared libs` | Files: `frontend/src/types/risk.ts`, `frontend/src/lib/risk.ts`, touched frontend lib tests

- [x] 6. Update overview dashboard and top-risk frontend consumers

  **What to do**: Refactor overview/dashboard consumers so exposure summaries, top-risk ranking, badges, and heatmap consumers read the shared final score and final matrix helpers. Ensure finalized records surface reviewed values as primary and heatmap cells match reviewed probability/impact.
  **Must NOT do**: Do not redesign cards/charts; only switch data semantics and labels where needed.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multiple coupled dashboard consumers with analytics logic
  - Skills: [`react-expert`] - safe Next.js/TypeScript consumer updates
  - Omitted: [`optimize`] - performance tuning is out of scope

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10 | Blocked By: 2, 3, 5

  **References**:
  - Pattern: `frontend/src/app/(app)/overview/page.tsx` - overview orchestration and data usage
  - Pattern: `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx` - top-risk badges/colors by score
  - Pattern: `frontend/src/app/(app)/overview/_components/risk-heatmap.tsx` - matrix cell rendering
  - Pattern: `frontend/src/lib/dashboard-insights.ts` - dashboard aggregation helper logic

  **Acceptance Criteria**:
  - [ ] `cd frontend && npm run test -- --runInBand src/lib/dashboard-insights.test.ts` exits 0
  - [ ] `cd frontend && npm run build` exits 0
  - [ ] Top-risk ordering and badge labels follow reviewed/effective values for finalized risks
  - [ ] Heatmap placement for finalized risks follows reviewed probability/impact via shared helpers

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Dashboard aggregations use final score semantics
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand src/lib/dashboard-insights.test.ts | tee ../.sisyphus/evidence/task-6-dashboard-insights.txt
    Expected: PASS output confirms exposure summaries and top-risk groupings rank finalized fixtures by reviewed/effective values
    Evidence: .sisyphus/evidence/task-6-dashboard-insights.txt

  Scenario: Overview build stays valid after helper switch
    Tool: Bash
    Steps: cd frontend && npm run build | tee ../.sisyphus/evidence/task-6-dashboard-build.txt
    Expected: Next.js build exits successfully with no TypeScript errors from overview/top-risk/heatmap consumers
    Evidence: .sisyphus/evidence/task-6-dashboard-build.txt
  ```

  **Commit**: YES | Message: `fix(frontend): apply final reviewed score semantics to overview dashboards` | Files: `frontend/src/app/(app)/overview/page.tsx`, `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`, `frontend/src/app/(app)/overview/_components/risk-heatmap.tsx`, `frontend/src/lib/dashboard-insights.ts`, touched tests

- [x] 7. Update register, history, and review-related frontend surfaces

  **What to do**: Refactor risk register, history, new/review pages, approval modal, and review side panel so primary score columns/labels use final reviewed/effective values where appropriate, while inherent remains visible only as secondary comparison/history. Preserve pending/in-review semantics so unapproved reviewed values do not appear as final.
  **Must NOT do**: Do not remove deliberate comparison displays between preliminary vs reviewed values in review workflows.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: many user-facing score surfaces with status-sensitive logic
  - Skills: [`react-expert`, `clarify`] - safe stateful UI updates and precise labels
  - Omitted: [`onboard`] - no onboarding change

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10 | Blocked By: 2, 5

  **References**:
  - Pattern: `frontend/src/app/(app)/risk/register/page.tsx` - list, filters, counts, and primary score columns
  - Pattern: `frontend/src/app/(app)/risk/history/page.tsx` - historical/current vs target comparison
  - Pattern: `frontend/src/app/(app)/risk/register/new/page.tsx` - review screen labels and status-sensitive score display
  - Pattern: `frontend/src/components/risk/review-side-panel.tsx` and `frontend/src/components/approval-modal.tsx` - review/approval score display and posting flow

  **Acceptance Criteria**:
  - [ ] `cd frontend && npm run build` exits 0
  - [ ] Register/history/review surfaces compile against centralized final-score helpers
  - [ ] Finalized records show reviewed/effective as primary and inherent only as secondary comparison/history
  - [ ] Pending/in-review records do not leak candidate reviewed values into primary/final columns

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Register/history/review consumers compile with final score semantics
    Tool: Bash
    Steps: cd frontend && npm run build | tee ../.sisyphus/evidence/task-7-register-history-build.txt
    Expected: Next.js build exits successfully with no type/runtime compile errors in register/history/review consumers
    Evidence: .sisyphus/evidence/task-7-register-history-build.txt

  Scenario: Review comparison semantics remain explicit
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand src/lib/risk-cycle-detail-export.test.ts src/lib/risk-report-trend.test.ts | tee ../.sisyphus/evidence/task-7-review-comparison.txt
    Expected: PASS output confirms comparison/history logic still retains inherent as secondary context while primary finalized values use reviewed/effective semantics
    Evidence: .sisyphus/evidence/task-7-review-comparison.txt
  ```

  **Commit**: YES | Message: `fix(frontend): align register history and review surfaces with final reviewed score` | Files: `frontend/src/app/(app)/risk/register/page.tsx`, `frontend/src/app/(app)/risk/history/page.tsx`, `frontend/src/app/(app)/risk/register/new/page.tsx`, `frontend/src/components/risk/review-side-panel.tsx`, `frontend/src/components/approval-modal.tsx`

- [x] 8. Update frontend trend, report, and export consumers

  **What to do**: Switch trend bucketing, cycle detail reporting, and export generators so finalized records use reviewed/effective score semantics and reviewed matrix inputs where relevant. Keep inherent score only as explicit comparison data in exports/history rows.
  **Must NOT do**: Do not change export format beyond the score semantics and labeling already required by the new business rule.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: reporting logic spans multiple shared libs and page consumers
  - Skills: [`react-expert`, `writing`] - TypeScript reporting logic and label precision
  - Omitted: [`mckinsey-style`] - not a presentation deck task

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10 | Blocked By: 2, 3, 5

  **References**:
  - Pattern: `frontend/src/lib/risk-report-trend.ts` - score-band trend bucketing
  - Pattern: `frontend/src/lib/risk-cycle-detail-export.ts` - export row shaping and movement semantics
  - Pattern: `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx` - detailed report consumer
  - Test: `frontend/src/lib/risk-report-trend.test.ts`, `frontend/src/lib/risk-cycle-detail-export.test.ts` - regression coverage to update

  **Acceptance Criteria**:
  - [ ] `cd frontend && npm run test -- --runInBand src/lib/risk-report-trend.test.ts src/lib/risk-cycle-detail-export.test.ts` exits 0
  - [ ] Trend and export outputs use reviewed/effective values as primary for finalized records
  - [ ] Comparison/history rows keep inherent only as explicit secondary context
  - [ ] Target/residual-related export/report semantics remain unchanged

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Trend bucketing follows final score semantics
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand src/lib/risk-report-trend.test.ts | tee ../.sisyphus/evidence/task-8-trend-bucketing.txt
    Expected: PASS output confirms finalized fixtures are bucketed by reviewed/effective values and preliminary fixtures remain bucketed by inherent values
    Evidence: .sisyphus/evidence/task-8-trend-bucketing.txt

  Scenario: Export rows preserve secondary inherent context without changing target semantics
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand src/lib/risk-cycle-detail-export.test.ts | tee ../.sisyphus/evidence/task-8-export-semantics.txt
    Expected: PASS output confirms exported primary scores use reviewed/effective values, inherent stays comparison-only, and target/residual outputs are unchanged
    Evidence: .sisyphus/evidence/task-8-export-semantics.txt
  ```

  **Commit**: YES | Message: `fix(frontend): align trends and exports with final reviewed score` | Files: `frontend/src/lib/risk-report-trend.ts`, `frontend/src/lib/risk-cycle-detail-export.ts`, `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx`, touched tests

- [x] 9. Add regression sweep for edge cases and compatibility paths

  **What to do**: Expand or add automated regression coverage across backend and frontend for approved records missing reviewed fields, non-finalized records with review drafts, falsey value handling, rank/filter/count parity, and protection of target/residual semantics.
  **Must NOT do**: Do not introduce manual QA dependencies or browser-only checks.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: regression hardening across both stacks
  - Skills: [`backend-go`, `react-expert`] - mixed-stack test additions
  - Omitted: [`systematic-debugging`] - this is prevention/hardening, not reactive debugging

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10 | Blocked By: 4, 6, 7, 8

  **References**:
  - Test: `backend/internal/domain/entity/risk_test.go` - backend edge-case host
  - Test: `backend/internal/usecase/risk/reassess_test.go` - reviewed-state regression host
  - Test: `frontend/src/lib/dashboard-insights.test.ts` - ranking/counting regression host
  - Test: `frontend/src/lib/risk-cycle-detail-export.test.ts` - comparison/export regression host

  **Acceptance Criteria**:
  - [ ] `cd backend && go test ./internal/domain/entity ./internal/usecase/approval ./internal/usecase/risk ./internal/repository/postgres ./internal/usecase/report ./internal/service/pdfreport -v` exits 0
  - [ ] `cd frontend && npm run test -- --runInBand` exits 0
  - [ ] Explicit regressions exist for compatibility fallback, non-finalized draft isolation, and target/residual protection
  - [ ] No tests rely on accidental falsy fallback for reviewed values

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Backend regression suite covers compatibility and status-gating
    Tool: Bash
    Steps: cd backend && go test ./internal/domain/entity ./internal/usecase/approval ./internal/usecase/risk ./internal/repository/postgres ./internal/usecase/report ./internal/service/pdfreport -v | tee ../.sisyphus/evidence/task-9-backend-regression.txt
    Expected: PASS output includes approved-missing-reviewed fallback cases, non-finalized isolation cases, and target/residual protection cases
    Evidence: .sisyphus/evidence/task-9-backend-regression.txt

  Scenario: Frontend regression suite covers ranking, exports, and falsy handling
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand | tee ../.sisyphus/evidence/task-9-frontend-regression.txt
    Expected: PASS output includes finalized ranking, export semantics, and explicit reviewed-value handling regressions
    Evidence: .sisyphus/evidence/task-9-frontend-regression.txt
  ```

  **Commit**: YES | Message: `test: lock score ranking export and fallback regressions` | Files: touched backend/frontend test files

- [x] 10. Run full verification gates and capture release evidence

  **What to do**: Run all required backend and frontend verification commands after the semantic refactor is complete, capture outputs into `.sisyphus/evidence`, and prepare a concise release summary highlighting defaulted compatibility behavior and unchanged target/residual semantics.
  **Must NOT do**: Do not mark work complete if any verification command fails or if review agents have not approved the final result.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: final release-quality verification across both stacks
  - Skills: [`verification-before-completion`] - evidence-first completion discipline
  - Omitted: [`requesting-code-review`] - formal review happens in Final Verification Wave

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: 4, 6, 7, 8, 9

  **References**:
  - Pattern: `backend/AGENTS.md` - documented backend verification commands
  - Pattern: `frontend/package.json` - frontend test/lint/build scripts
  - Test: `frontend/src/lib/dashboard-insights.test.ts`, `frontend/src/lib/risk-report-trend.test.ts`, `frontend/src/lib/risk-cycle-detail-export.test.ts` - high-signal regression suites

  **Acceptance Criteria**:
  - [ ] `cd backend && go test ./...` exits 0
  - [ ] `cd frontend && npm run test -- --runInBand && npm run lint && npm run build` exits 0
  - [ ] Evidence files exist for backend full suite, frontend full suite, lint, and build
  - [ ] Final summary explicitly states: reviewed/effective is primary final score, inherent is secondary only, reviewed matrix placement is active, target/residual semantics unchanged

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Backend full verification passes
    Tool: Bash
    Steps: cd backend && go test ./... -v | tee ../.sisyphus/evidence/task-10-backend-full-suite.txt
    Expected: All backend packages pass with exit code 0
    Evidence: .sisyphus/evidence/task-10-backend-full-suite.txt

  Scenario: Frontend verification gates pass
    Tool: Bash
    Steps: cd frontend && npm run test -- --runInBand && npm run lint && npm run build | tee ../.sisyphus/evidence/task-10-frontend-gates.txt
    Expected: Test, lint, and build all exit 0 with no remaining type/lint errors related to score semantics
    Evidence: .sisyphus/evidence/task-10-frontend-gates.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence and release summary only

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `test/refactor(backend): characterize and enforce final score semantics`
- Commit 2: `refactor(backend): switch score-driven queries to canonical final score`
- Commit 3: `fix(backend): align reports and heatmaps with reviewed final placement`
- Commit 4: `refactor(frontend): centralize final score semantics in shared libs`
- Commit 5: `fix(frontend): use final reviewed score across dashboards register history review exports`
- Commit 6: `test: lock score sorting counting export and build regressions`

## Success Criteria
- Approved/finalized risks are ranked, filtered, counted, colored, labeled, and exported by reviewed/effective score semantics.
- Reviewed heatmap/matrix placement uses reviewed probability/impact for finalized risks.
- Pending/in-review items do not leak unapproved reviewed values into final summaries.
- Inherent score remains available only as secondary comparison/history where applicable.
- Target/residual semantics remain unchanged.
