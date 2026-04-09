## 2026-04-09T00:00:00Z Task: initialization
- Plan started. Backend canonical score semantics must switch final risk score to reviewed/effective values.
- Inherent score remains comparison/history only.
- Reviewed heatmap placement must use reviewed probability/impact for finalized risks.

## 2026-04-09T00:00:00Z Task 1 implementation
- `backend/internal/domain/entity/risk.go` now treats reviewed probability/impact/weight/nilai/score as one approved-only bundle; any missing reviewed core field makes approved risks fall back to the inherent bundle as a whole.
- `GetRiskLevel()` now derives from `EffectiveNilai()`, so finalized level/priority follow the same canonical path as effective probability/impact/score.
- `GetEffectiveScore()` now tolerates partially hydrated inherent snapshot rows by falling back through stored inherent score, nilai, or matrix-derived probability/impact score instead of collapsing to zero.

## 2026-04-09T00:00:00Z Task 2 implementation
- Centralized repository final-score semantics in SQL helpers so approved complete bundles use reviewed score/probability/impact and legacy partial bundles fall back coherently to preliminary values.
- Dashboard, top-risk, and review-queue queries now share the same approved-bundle guard, which keeps preview rows from being promoted accidentally.

## 2026-04-09T00:00:00Z Task 2 fix
- When a helper emits alias-qualified score SQL, every read query must either alias its `FROM risks` table or the SQL becomes invalid; the review queue candidate snapshot also needs the full bundle of fields the helper can reference.

## 2026-04-09T00:00:00Z Task 3 implementation
- `GetHeatmapVelocity` now shares the same approved reviewed-bundle gate as the other backend heatmap paths: approved rows land in velocity cells by finalized probability/impact only when the reviewed bundle is complete, otherwise they fall back coherently to preliminary placement.
- Velocity movement now compares finalized/effective score semantics for approved rows, while `CompareCycles` stays on inherent-score historical semantics.

## 2026-04-09T00:00:00Z Task 4 implementation
- Added backend regression coverage proving `GenerateReportUseCase` summary, heatmap, trend buckets, and top-risk ordering stay on effective/reviewed helpers for approved complete bundles.
- Added PDF renderer regression coverage by inspecting rendered row structures, locking risk-register effective probability/impact/score/level output and top-risk badge score/level color semantics.
- Added detailed cycle comparison regression coverage proving side-by-side snapshots and field diffs stay on stored `Probability`, `Impact`, `InherentScore`, and `Target*` history values even when reviewed fields differ.

## 2026-04-09T00:00:00Z Task 5 implementation
- `frontend/src/lib/risk.ts` now exposes a single `resolveRiskScoreSemantics` contract that returns effective/primary and inherent snapshots, including probability, impact, weight, nilai, score, level, priority, and matrix labels/cell key.
- Frontend reviewed activation now matches backend semantics: only `approved` risks with the full reviewed score bundle switch to reviewed/effective values; partial reviewed bundles fall back coherently to the inherent bundle.

## 2026-04-09T00:00:00Z Task 6 implementation
- `dashboard-insights` current-state consumers now route overview exposure and executive trend scoring through `resolveRiskScoreSemantics(...).effective.score`, so approved complete reviewed bundles promote reviewed/final scores while partial or non-approved rows stay on inherent semantics.
- The overview KPI exposure reducer and top-risks score badge now use the same effective/primary score source of truth; movement snapshot/chart/badge helpers and the overview heatmap contract remain comparison/backend driven.

## 2026-04-09T00:00:00Z Task 7 implementation
- `risk/register/page.tsx` now routes summary level badges, table score/level cells, and reassessment confirmation score copy through `resolveRiskScoreSemantics`, so approved current rows show final/effective values while non-approved rows stay preliminary automatically.
- `risk/register/new/page.tsx` now uses the shared helper for the locked/current assessment summary, but keeps reviewer comparison cards and the review side panel explicitly split between inherent (`Skor Awal` / `Skor Sementara`) and reviewed (`Skor Review` / `Skor Resmi`) values.
- `risk/history/page.tsx` stays comparison-oriented, with only the current side switched to effective/final semantics for approved rows while target/history context remains explicit.


## 2026-04-09T00:00:00Z Task 8 implementation
- Frontend trend bucketing now resolves primary score semantics through `resolveRiskScoreSemantics`, so approved complete reviewed bundles bucket by effective score while partial reviewed bundles fall back to inherent semantics.
- Cycle-detail report movement filtering and workbook trend labels now compare effective scores, while raw comparison/history columns (`probability`, `impact`, `inherentScore`, `nilai`, `riskPriority`, `target*`) remain untouched.
- Focused Task 8 tests passed and the frontend production build stayed green.


## 2026-04-09T00:00:00Z Task 8 verification fix
- Direct Node test execution for the focused Task 8 files now succeeds after adding a local `frontend/src/lib/risk.js` shim and pointing the touched frontend helpers at that shim.
- The fix is module-resolution only; semantics and export comparison columns remained unchanged.

## 2026-04-09T00:00:00Z Task 9 implementation
- Added backend regression coverage for approved partial reviewed bundles, cloned reassessment drafts, repository ranking/count parity SQL markers, and report/PDF fallback + draft-isolation scenarios without changing score business rules.
- Added frontend regression coverage proving explicit zero reviewed values stay canonical for approved rows, non-finalized reviewed drafts stay on inherent semantics, and cycle/history/export paths continue protecting target/residual and comparison columns.
- The full frontend suite is now runnable under the existing Node test runner after aligning `meeting-minutes-utils` and `risk-export` imports with the project’s explicit-extension compatibility pattern and adding the missing `validateKRISkipForm` export expected by the KRI validation tests.

## 2026-04-09T00:00:00Z Task 10 verification
- Full backend and frontend release gates now pass, and the evidence files capture fresh green runs for `go test ./... -v` plus `npm test && npm run lint && npm run build`.
- Verified release semantics stayed intact end-to-end: approved complete reviewed bundles remain the effective/final primary score and reviewed matrix placement, while inherent stays the secondary comparison/history and compatibility-fallback path.
- The only minimal unblockers needed outside the reviewed-score work were restoring KRI amber-threshold validation for `higher_worse` / `lower_worse` entities and updating KRI report submit tests to provide an in-window `PeriodEnd` fixture for the current submission-window rule.
- Frontend release verification still emits the known `MODULE_TYPELESS_PACKAGE_JSON` warnings during `npm test`; they remain warnings only.

## 2026-04-09T00:00:00Z Final-wave KRI direction consistency fix
- `backend/internal/domain/entity/kri.go` now normalizes `higher_worse` / `lower_worse` together with legacy `increasing` / `decreasing`, so `Validate()`, `IsThresholdBreached()`, and `GetStatus()` all follow the same direction vocabulary.
- Canonical warning semantics now use explicit amber thresholds for `higher_worse` / `lower_worse`, while legacy aliases still work through the same normalized path with the old heuristic fallback preserved for non-hydrated cases.
- Focused verification passed for `go test ./internal/domain/entity ./internal/usecase/kri -v`.

## 2026-04-09T00:00:00Z Task F3 manual QA
- Local manual QA was runnable with the checked-in backend/frontend setup and seeded credentials; the frontend restored JWT from `localStorage.manris_token`, and browser access worked cleanly on `http://localhost:3000` with the backend on `http://localhost:8080`.
- The approved risk detail and comparison-oriented surfaces behaved correctly: `/risk/register` showed `R-001` with primary score `25`, `/risk/register/new?id=42ed9090-71b6-4828-82cb-9f670f9263ee` labeled `Skor Final: 25` while keeping `Skor Sementara: 19`, and `/risk/history` showed `skor current/final: 25`.
- The overview top-risk surface still leaked inherent semantics: `/overview` rendered `R-001` with score `19` even though the authenticated risk payload for the same approved record exposed `reviewedScore: 25` and reviewed matrix inputs `5 x 5`.

## 2026-04-09T00:00:00Z Task F3 top-risks payload fix
- Root cause was payload parity, not ranking logic: `backend/internal/repository/postgres/risk.go` already ordered `TopRisks(...)` by `finalizedScoreExpr("r")`, but the query only selected/scanned preliminary fields, so the overview resolver never received the reviewed bundle needed to render the same final score.
- Minimal fix: `TopRisks(...)` now returns `nilai` plus the full reviewed bundle (`reviewedProbability`, `reviewedImpact`, `reviewedWeight`, `reviewedNilai`, `reviewedScore`), and `frontend/src/types/risk.ts` now exposes those optional fields on `TopRiskItem` so `TopRisksPanel` can resolve the approved/effective score without UI redesign.
