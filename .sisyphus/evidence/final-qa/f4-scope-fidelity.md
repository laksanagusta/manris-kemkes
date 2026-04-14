# F4 — Scope Fidelity Check

> **Tasks [9/9 compliant] | Contamination [CLEAN] | Unaccounted [CLEAN — 16 cascading files justified] | VERDICT: CONDITIONAL APPROVE**

**Date**: 2026-04-14
**Auditor**: F4 Scope Fidelity Agent (deep)
**Plan**: `.sisyphus/plans/risk-residual-scoring-fix.md` (980 lines)
**Diff**: 31 modified files + 2 new migration files, +286/-2058 lines

---

## Per-Task 1:1 Compliance

### Task 1: DB Migration — Drop Reviewed Score Columns
**Spec**: Create `000037_remove_reviewed_score_fields.{up,down}.sql` dropping 9 columns.
**Actual**: COMPLIANT
- `up.sql`: Drops all 9 columns (reviewed_probability, reviewed_impact, reviewed_weight, reviewed_nilai, reviewed_score, score_change_label, effectiveness_label, reviewed_by, reviewed_at) via single ALTER TABLE with DROP COLUMN IF EXISTS
- `down.sql`: Restores all 9 with correct types matching original migration 000027 (INTEGER, DOUBLE PRECISION, TEXT, UUID REFERENCES, TIMESTAMPTZ)
- Down file adds COMMENT ON COLUMN statements — extra but harmless documentation
- Migration number 000037 correct (after 000036)
- No new columns added, no other tables touched
**Guardrails**: G1 (target_* untouched) ✅, G5 (no column renames) ✅

### Task 2: Backend Entity — Remove Reviewed Score Fields & Methods
**Spec**: Remove 9 struct fields, remove `ApplyReviewerScore()`, `hasCompleteReviewedScoreBundle()`, simplify `Effective*()` methods.
**Actual**: COMPLIANT
- Removed all 9 fields from Risk struct (ReviewedProbability, ReviewedImpact, ReviewedWeight, ReviewedNilai, ReviewedScore, ScoreChangeLabel, EffectivenessLabel, ReviewedBy, ReviewedAt)
- Removed `hasCompleteReviewedScoreBundle()` method
- Removed `ApplyReviewerScore()` method (with all derived label computation: `computeScoreChangeLabel`, `computeEffectivenessLabel`)
- Simplified `EffectiveProbability()` → returns `r.Probability` directly
- Simplified `EffectiveImpact()` → returns `r.Impact` directly
- Simplified `EffectiveNilai()` → returns `r.Nilai` directly
- Simplified `GetEffectiveScore()` → returns `r.effectivePreliminaryScore()` directly
- Methods kept (not removed entirely) — callers still use them, which is the safer approach per spec "Or remove ... and update callers"
**Guardrails**: G1 (Target* untouched) ✅, G3 (bobot matrix unchanged) ✅, G5 (no field renames) ✅

### Task 3: Backend Usecase — Remove Reviewer Scoring from Approval Action
**Spec**: Remove `ReviewedProbability`/`ReviewedImpact` from `ApprovalActionInput`, remove reviewer scoring logic block. Check handler.
**Actual**: COMPLIANT
- Removed both fields from `ApprovalActionInput` struct
- Removed entire reviewer scoring logic block (the `if status == approved && ReviewedProbability != nil` block)
- Removed pre-save of reviewed fields before `ActivateApprovedVersion`
- Updated comment on `updateEntityStatus` method
- `handler/http/risk.go` NOT modified — but has zero stale references because the handler binds via JSON tags on the struct, removing struct fields was sufficient. Confirmed via grep: 0 matches for reviewed* in handler dir.
**Guardrails**: G2 (step_type unchanged — 0 changes to step_type in diff) ✅, G7 (no workflow UX redesign) ✅

### Task 4: Backend Repository — Simplify Score Queries
**Spec**: Remove `finalizedProbabilityExpr()`, `finalizedImpactExpr()`, `finalizedScoreExpr()` helpers. Replace with direct column refs. Remove reviewed_* from all SELECT/INSERT/UPDATE/Scan.
**Actual**: COMPLIANT
- Removed all 3 `finalized*Expr()` helper functions (~42 lines each)
- Replaced all usages with direct `r.probability`, `r.impact`, `r.inherent_score` references
- Cleaned INSERT query: removed 9 reviewed columns + reduced parameter count ($51→$42)
- Cleaned UPDATE query: removed 9 reviewed columns + reduced parameter count
- Cleaned GetByID SELECT/Scan: removed reviewed columns
- Cleaned List SELECT/Scan: removed reviewed columns
- Cleaned ListRegister SELECT/Scan: removed reviewed columns
- Cleaned ListApprovedRisks SELECT/Scan: removed reviewed columns
- Cleaned ListVersions SELECT/Scan: removed reviewed columns
- Cleaned ListCycleSnapshot SELECT/Scan: removed reviewed columns
- Cleaned getInProgressReassessmentForCycle SELECT/Scan: removed reviewed columns
- Cleaned TopRisks SELECT/Scan: removed reviewed columns + simplified ORDER BY
- Cleaned DashboardSummary: `finalizedScoreExpr("r")` → `"r.inherent_score"`
- Cleaned DashboardCategoryCounts: same
- Cleaned HeatmapData: `finalizedProbabilityExpr`/`finalizedImpactExpr` → direct column refs
- Cleaned ListReviewQueue: simplified score expressions + lateral join SELECT
- Cleaned CompareCycles: simplified score expressions
- Cleaned RiskReviewSummary/loadHeatmap: simplified
- Cleaned heatmapVelocityQuery: replaced all finalized expressions with direct column refs
**Guardrails**: G1 (target_* all present — 22 refs in risk.go, 7 in working_paper.go) ✅, G3 (bobot matrix unchanged) ✅, G5 (no column renames) ✅

### Task 5: Backend Repository — Update Working Paper Queries
**Spec**: Simplify `finalizedWorkingPaperRiskExpr()` to use base fields.
**Actual**: COMPLIANT
- Changed function signature from `(alias, reviewedField, baseField string)` to `(alias, baseField string)` — 3 params → 2 params
- Simplified body: returns `alias.baseField` directly instead of CASE/WHEN/COALESCE
- Updated all 4 callers to use 2-arg version
- Added comment explaining the change
**Note**: Function kept (not deleted) which is slightly different from spec ("Remove any COALESCE(reviewed_*, base) patterns — use base directly") but the function now returns base directly, so semantically identical.

### Task 6: Backend Tests — Update Risk Score Semantics Tests
**Spec**: Remove dual-score test cases, update remaining tests.
**Actual**: COMPLIANT (aggressive but justified)
- Reduced from 228 lines to 11 lines
- Replaced all dual-score test cases with a single stub test `TestRiskScoreSemanticsStub`
- Spec said "Update remaining test cases" but since ALL tests tested removed behavior (reviewed score overriding), gutting to stub is the correct approach
- No new test scenarios added (compliant with "DO NOT add new test scenarios")

### Task 7: Frontend Types + Core Logic
**Spec**: Remove reviewed fields from 3 interfaces in types/risk.ts, simplify resolveRiskScoreSemantics(), remove hasCompleteReviewedRiskScoreBundle(), stub buildInherentResidualTrendData().
**Actual**: COMPLIANT
- `types/risk.ts`: Removed reviewed fields from `RiskVersionTimelineItem` (5 fields), `Risk` (10 fields including labels), `TopRiskItem` (5 fields) — 3 interfaces as specified
- `lib/risk.ts`: 
  - Simplified `resolveRiskScoreSemantics()` — removed reviewed branch, always returns inherent. Changed `source` type from union `"inherent" | "reviewed"` to literal `"inherent"`, `usesReviewed` from `boolean` to `false`
  - Removed `hasCompleteReviewedRiskScoreBundle()` function
  - Removed `buildReviewedRiskScoreSnapshot()` function
  - Removed `reviewedProbability`/`reviewedImpact`/`reviewedWeight`/`reviewedNilai`/`reviewedScore` from `RiskScoreSemanticFields` type
- `lib/risk-history.ts`: Removed reviewed fields from `RiskScoreLike` type (5 fields) and `ApprovedRiskHistoryLike` type (5 fields), removed from `resolveTimelineScoreSemantics()` and `buildApprovedRiskHistoryItem()` calls
- `lib/api/risk-register.ts`: Removed 5 reviewed fields from `RiskRegisterListItem`
- `lib/dashboard-insights.ts`: 
  - Removed reviewed fields from `RiskLike` type
  - Removed reviewed fields from 3 `resolveRiskScoreSemantics()` call sites (`buildUnitExposureData`, `buildExecutiveTrendData`, `buildCriticalRiskRateTrendData`)
  - Stubbed `buildInherentResidualTrendData()` to return `[]` with `// TODO: GAP-4 follow-up` comment
**Guardrails**: G4 (resolveRiskScoreSemantics not over-refactored — only reviewed branch removed, function signature preserved) ✅

### Task 8: Frontend Components — Delete Scoring Grid, Update Approval UI
**Spec**: Delete `review-scoring-grid.tsx`, clean `approval-modal.tsx`, clean `review-side-panel.tsx`, stub `inherent-residual-trend.tsx`.
**Actual**: COMPLIANT
- `review-scoring-grid.tsx`: DELETED entirely (186 lines) ✅
- `approval-modal.tsx`: 
  - Removed `ReviewScoringGrid` import
  - Removed `AlertTriangle` import (was only used for scoring section)
  - Removed `reviewedProbability`/`reviewedImpact` state variables
  - Removed `showScoring` variable
  - Removed scoring validation check
  - Removed scoring payload construction
  - Removed scoring state reset
  - Removed scoring grid render section
  - Removed scoring-dependent disabled logic from submit button
  - Simplified dialog width (removed `showScoring && "sm:max-w-lg"`)
- `review-side-panel.tsx`:
  - Removed `ReviewScoringGrid` import
  - Removed risk scoring utility imports (`getRiskLevelDisplayLabel`, `getLevelBadgeClasses`, `getScoreBtnColorClasses`, `getBobot`, `calculateNilai`, `getRiskLevelFromNilai`)
  - Removed `reviewedScore`, `reviewedProbability`, `reviewedImpact` props
  - Removed state variables and useEffect hooks for reviewed values
  - Removed `renderScoreSummary()` function entirely
  - Removed scoring validation from `handleAction()`
  - Removed scoring payload construction
  - Removed scoring grid from review dialog
  - Removed scoring-dependent disabled logic
  - Removed reviewed score summary from approval dialog
- `inherent-residual-trend.tsx`: Entire component body replaced with `return null;` with `// TODO: redesign after GAP-4` comment ✅
**Guardrails**: G7 (no approval UX redesign — only scoring removal) ✅, G8 (trend chart stubbed with TODO, not rewritten) ✅

**Path Deviations** (known acceptable):
- `approval-modal.tsx` at `components/` not `components/shared/` — file was already at that path
- `review-side-panel.tsx` at `components/risk/` not `components/shared/` — file was already at that path

### Task 9: Frontend Pages — Update Risk Register, Dashboard, Rename Labels
**Spec**: Clean register/page.tsx, top-risks-panel.tsx, rename labels to "Residual" in new/page.tsx.
**Actual**: COMPLIANT with ONE BUG FOUND
- `register/page.tsx`: Removed 5 reviewed field references from `resolveListItemScoreSemantics()` ✅
- `top-risks-panel.tsx`: Removed `TopRiskScoreSemanticsInput` type and 5 reviewed field casts from score resolution ✅
- `register/new/page.tsx`:
  - Removed `RiskApiResponse` reviewed fields (10 fields)
  - Removed `reviewerScoreData` state variable
  - Removed reviewer score data loading logic
  - Removed `reviewedBy` from `resolveDraftApprovalLine()` call
  - Removed reviewed fields from `currentScoreSemantics` useMemo
  - Simplified `currentScoreLabel` to "Skor Risiko"
  - Added residual risk explanation text: "Nilai probabilitas dan dampak sudah mempertimbangkan kontrol yang ada (residual risk)" ✅
  - Changed "Dampak" → "Dampak (Residual)" ✅
  - Removed reviewer score card (90-line block) ✅
  - Simplified ReviewSidePanel props (removed reviewed* props)

**BUG**: Line 1930 — Label "Kode Risiko" was incorrectly changed to "Probabilitas (Residual)". The Controller underneath is `name="riskCode"` with placeholder "Terisi otomatis setelah draft disimpan" (auto-filled after draft save). This is clearly the Risk Code field, NOT a probability field. **This is a labeling error — "Kode Risiko" should have been left unchanged.**

**Path Deviation** (known acceptable):
- `top-risks-panel.tsx` at `overview/_components/` not `dashboard/overview/` — file was already at that path

---

## Guardrail Compliance

| # | Guardrail | Status | Evidence |
|---|-----------|--------|----------|
| G1 | DO NOT touch target_* columns | ✅ PASS | 29 target_* refs still present in repo (22 risk.go + 7 working_paper.go) |
| G2 | DO NOT change step_type enum | ✅ PASS | 0 step_type changes in diff; 4 existing refs in approval.go unchanged |
| G3 | DO NOT modify bobot matrix | ✅ PASS | Only removed `weight := GetBobot(...)` inside deleted `ApplyReviewerScore()`; `GetBobot` function itself unchanged |
| G4 | DO NOT over-refactor resolveRiskScoreSemantics | ✅ PASS | Only reviewed branch removed; function signature preserved; type narrowed (source: "inherent", usesReviewed: false) |
| G5 | DO NOT rename DB columns | ✅ PASS | No ALTER RENAME in any migration; probability/impact/inherent_score columns unchanged |
| G6 | DO NOT add new inherent fields | ✅ PASS | No ADD COLUMN with inherent in any migration |
| G7 | DO NOT redesign approval UX | ✅ PASS | Only scoring elements removed from modal/panel; approve/reject flow intact |
| G8 | DO NOT rewrite trend chart | ✅ PASS | Component returns `null` with `// TODO: redesign after GAP-4` comment |
| G9 | Compilation passes | ✅ PASS | `go build ./...` exits 0; `npx tsc --noEmit` exits 0 |

---

## Cross-Task Contamination Check

| Task | Expected Files | Actual Files | Contamination |
|------|---------------|--------------|---------------|
| T1 | migrations/000037* | migrations/000037* (2 new files) | CLEAN |
| T2 | domain/entity/risk.go | domain/entity/risk.go | CLEAN |
| T3 | usecase/approval/action.go | usecase/approval/action.go | CLEAN |
| T4 | repository/postgres/risk.go | repository/postgres/risk.go | CLEAN |
| T5 | repository/postgres/working_paper.go | repository/postgres/working_paper.go | CLEAN |
| T6 | repository/postgres/risk_score_semantics_test.go | risk_score_semantics_test.go | CLEAN |
| T7 | types/risk.ts, lib/risk.ts, lib/risk-history.ts, lib/api/risk-register.ts, lib/dashboard-insights.ts | All 5 files | CLEAN |
| T8 | review-scoring-grid.tsx (DEL), approval-modal.tsx, review-side-panel.tsx, inherent-residual-trend.tsx | All 4 files + new/page.tsx overlap with T9 | CLEAN (new/page.tsx in both T8 and T9 scope) |
| T9 | register/page.tsx, top-risks-panel.tsx, register/new/page.tsx | All 3 files | CLEAN |

**No cross-task contamination detected.** Each task touched only its own files. The register/new/page.tsx overlap between T8 and T9 is expected (both tasks modify different sections of the same file).

---

## Unaccounted Files Classification

### Cascading Backend Changes (justified — necessary for removing struct fields)
| File | Justification |
|------|---------------|
| `domain/entity/risk_test.go` | Tests use removed struct fields — renamed test + removed 4 test functions |
| `usecase/workingpaper/risk_resolution.go` | `effectiveWorkingPaperWeight()` referenced removed reviewed_* fields |
| `service/pdfreport/renderer_test.go` | Tests construct Risk entities with removed fields |
| `usecase/risk/compare_cycle_detail_test.go` | Tests construct Risk entities with removed fields |
| `usecase/risk/reassess_test.go` | Tests construct Risk entities with removed fields |
| `usecase/report/generate_test.go` | Tests construct Risk entities with removed fields |

### Cascading Frontend Changes (justified — necessary for removing type fields)
| File | Justification |
|------|---------------|
| `lib/risk.test.ts` | Tests use removed reviewed fields |
| `lib/risk-history.test.ts` | Tests use removed reviewed fields |
| `lib/dashboard-insights.test.ts` | Tests use removed reviewed fields |
| `lib/risk-report-trend.ts` | Uses resolveRiskScoreSemantics with reviewed fields |
| `lib/risk-report-trend.test.ts` | Tests use removed reviewed fields |
| `lib/risk-cycle-detail-export.test.ts` | Tests use removed reviewed fields |
| `app/(app)/risk/working-papers/new/page.tsx` | Uses reviewed* fields from Risk type |

### Meta Files (excluded per instructions)
| File | Note |
|------|------|
| `.sisyphus/drafts/risk-assessment-form-review.md` | DELETED — sisyphus meta-file, excluded from analysis |

### Missing Expected Changes
| File | Note |
|------|------|
| `handler/http/risk.go` | Plan said "Check handler" but no changes needed — JSON struct binding makes struct field removal sufficient. Confirmed: 0 stale refs in handler. |
| `risk-approval-line.ts` | `reviewedBy` optional parameter still exists but is now dead code. Minor cleanup miss, not a functional issue. |

**Total**: 16 cascading files (6 backend + 7 frontend + 3 meta/missing). All justified by the plan's noted "NECESSARY cascading changes from removing the reviewed_* fields."

---

## Issues Found

### BUG (Severity: Medium)
**File**: `frontend/src/app/(app)/risk/register/new/page.tsx:1930`
**Issue**: Label "Kode Risiko" was incorrectly changed to "Probabilitas (Residual)". The Controller underneath is `name="riskCode"` with placeholder "Terisi otomatis setelah draft disimpan" — this is the Risk Code field, NOT probability.
**Impact**: Users see "Probabilitas (Residual)" label on the Risk Code input field, which is confusing/incorrect.
**Fix**: Revert line 1930 back to "Kode Risiko".

### Minor Cleanup (Severity: Low)
**File**: `frontend/src/lib/risk-approval-line.ts:15`
**Issue**: `reviewedBy?: string | null` parameter is now dead code — no callers pass it. Function still works (falls through to `members[0]`), but the legacy reviewedBy fallback path is never triggered.
**Impact**: None — functional but dead code.
**Fix**: Remove `reviewedBy` parameter and simplify the function body. Update test file.

---

## Stale Reference Sweep

| Pattern | Backend (excl .down.sql) | Frontend | Total |
|---------|--------------------------|----------|-------|
| ReviewedProbability / reviewedProbability / reviewed_probability | 0 | 0 | 0 |
| ReviewedImpact / reviewedImpact / reviewed_impact | 0 | 0 | 0 |
| ReviewedWeight / reviewedWeight / reviewed_weight | 0 | 0 | 0 |
| ReviewedNilai / reviewedNilai / reviewed_nilai | 0 | 0 | 0 |
| ReviewedScore / reviewedScore / reviewed_score | 0 | 0 | 0 |
| ScoreChangeLabel / scoreChangeLabel / score_change_label | 0 | 0 | 0 |
| EffectivenessLabel / effectivenessLabel / effectiveness_label | 0 | 0 | 0 |
| ApplyReviewerScore | 0 | 0 | 0 |
| hasCompleteReviewedScoreBundle / hasCompleteReviewedRiskScoreBundle | 0 | 0 | 0 |
| ReviewScoringGrid / review-scoring-grid | 0 | 0 | 0 |
| finalizedScoreExpr / finalizedProbabilityExpr / finalizedImpactExpr | 0 | 0 | 0 |
| reviewed_by / reviewed_at (in non-migration code) | 0 | 0* | 0* |

*`risk-approval-line.ts` has `reviewedBy` parameter — dead but harmless (see Minor Cleanup above).

---

## Verdict

> **Tasks [9/9 compliant] | Contamination [CLEAN] | Unaccounted [CLEAN — 16 cascading files justified] | VERDICT: CONDITIONAL APPROVE**

### Conditions for Full Approval:
1. **Fix "Kode Risiko" label bug** — Revert `frontend/src/app/(app)/risk/register/new/page.tsx:1930` from "Probabilitas (Residual)" back to "Kode Risiko"

### Optional Cleanup (non-blocking):
2. Remove dead `reviewedBy` parameter from `risk-approval-line.ts` and update its test

All 9 tasks are spec-compliant. Guardrails G1-G9 all pass. Zero stale references. Zero cross-task contamination. Build and TypeScript compilation pass. The one blocking issue is a labeling bug that is easy to fix.
