## Learnings

## Task 1: DB Migration - Learnings

### Key Pattern: 3-Phase Migration
Followed the exact pattern from migration 000029:
1. **Phase 1**: DROP constraint (allows intermediate data state)
2. **Phase 2**: UPDATE all rows with mapping logic
3. **Phase 3**: ADD new constraint (enforces new state)

### Status Mapping Choices
- `draft` → `assessment_draft` (required rename)
- `in_review` → `assessment_in_review` (required rename)
- `in_approval` → `assessment_in_review` (collapse approval step into single status)
- `rejected` → `assessment_draft` (rejection returns to draft state)
- `approved` → `approved` (unchanged for stability)

### Rollback Asymmetry Justified
DOWN migration has inherent ambiguity:
- Can't know if row was `draft` or `rejected` → choose `draft` (simpler state)
- Can't know if row was `in_review` or `in_approval` → choose `in_review` (simpler state)
This is acceptable for rollback since it's development-time recovery, not production concern.

### SQL Constraint Syntax
PostgreSQL 5-value constraint:
```sql
CHECK (status IN ('draft', 'in_review', 'in_approval', 'approved', 'rejected'))
```

PostgreSQL internal representation (ANY array):
```sql
CHECK ((status = ANY (ARRAY[...values...])))
```
Both are equivalent; internal form preferred by pg_get_constraintdef().

### Evidence Generated
- ✅ `task-1-migration-apply.txt` — Successful apply + verification
- ✅ `task-1-migration-rollback.txt` — Rollback idempotency proof
- ✅ Commit: `46ebdee` — chore(db): migrate risk statuses to 3-status model

### Next Task Dependency
Task 2 (Go domain constants) can now proceed. Backend code must be updated to use new status constants that match these DB values: `assessment_draft`, `assessment_in_review`, `approved`.


## Task 2: Go Domain Constants - Learnings

### Constant Updates Completed
1. `RiskStatusDraft`: `"draft"` → `"assessment_draft"` ✅
2. `RiskStatusInReview`: `"in_review"` → `"assessment_in_review"` ✅
3. `RiskStatusApproved`: `"approved"` (unchanged) ✅
4. Removed `RiskStatusInApproval` constant
5. Removed `RiskStatusRejected` constant

### Validation Method Updates
- `CanBeSubmittedForApproval()`: Now only `RiskStatusDraft` allowed (removed `RiskStatusRejected` check)
- `IsLocked()`: Now only `RiskStatusInReview || RiskStatusApproved` (removed InApproval and Rejected)
- `CanBeReassessed()`: Unchanged (already correct - checks `IsApprovedCurrent()`)
- `IsApprovedCurrent()`: Unchanged

### Test Coverage
All 40 domain entity tests pass (including risk_test.go updates)

### Files Still Referencing Removed Constants (Expected Errors - Task 3-5)
These files will fail to compile until their logic is updated:
1. `internal/service/pdfreport/renderer_test.go` - Lines 90, 98 (RiskStatusInApproval)
2. `internal/usecase/report/generate_test.go` - Line 260 (RiskStatusInApproval)
3. `internal/usecase/approval/action.go` - Lines 104, 120 (RiskStatusInApproval)

### Evidence Generated
- ✅ All 40 domain entity tests pass
- ✅ No diagnostics errors in risk.go
- ✅ Constants and validation methods match 3-status model

### Next Steps (Tasks 3-5)
Tasks 3-5 will update the files listed above to use the new statuses and handle the removal of InApproval/Rejected states.

## Task 3: Approval Workflow Status Update

### Changes Made
- `action.go`: Removed `RiskStatusInApproval` references. Reviewer approve no longer changes risk status (stays `assessment_in_review`). Only final "approval" step type sets `approved`. Rejection always → `assessment_draft`.
- `action.go`: Simplified the nextStep branch — reviewer approve with next step no longer updates entity status at all (risk stays `assessment_in_review` throughout).
- Tests updated to use `entity.RiskStatusDraft`, `entity.RiskStatusInReview`, `entity.RiskStatusApproved` constants instead of hardcoded strings.
- Fixed `ListApprovedRisks` signature in both test fake repos (added `string` param) — pre-existing interface change from another task.
- `submit.go` already used `entity.RiskStatusInReview` correctly, no changes needed.
- Renamed `RejectFromInApproval` test to `RejectFromInReview_ByPimpinan` since `in_approval` status no longer exists.

### Key Insight
The 3-status model simplifies the approval flow: risk status only changes at submission (draft→in_review) and at final approval (in_review→approved) or rejection (→draft). The intermediate reviewer approval step no longer triggers a status change.

## Task 4: Status Migration in Usecase/Repository Layer (completed)

### Changes Made
- `create.go`: `"draft"` → `entity.RiskStatusDraft`
- `update.go`: `"approved"`/`"draft"` → constants; removed `"rejected"` status transition block entirely
- `reassess.go`: `"reviewed"` → `entity.RiskStatusInReview` in `FindInProgressReassessmentForCycle`
- `repository/postgres/risk.go`: 16+ SQL query changes:
  - `'draft'` → `'assessment_draft'` in all WHERE/CASE clauses
  - `'in_approval'` → `'assessment_in_review'` in heatmap/top-risks IN clauses
  - `'reviewed'` → `'assessment_in_review'` in GetOrCreatePeriodicReassessmentInTx
  - Removed `'rejected'` and `'in_approval'` from ListReviewQueue CASE statements
- Fixed `ListApprovedRisks` signature mismatch across 11 test files (added `string` param)
- Fixed `RiskStatusInApproval` references in pdfreport and report test files

### Key Learnings
- `ListApprovedRisks` interface had already been updated to include `query string` param but many test fakes were stale
- `ast_grep_replace` corrupts single-line function bodies (replaces body with literal `$$$`) - avoid for inline functions
- The ListReviewQueue CASE maps DB statuses to display values (e.g., `'assessment_draft'` → `'in_draft'`), keeping the API contract stable
- No `create_test.go` or `update_test.go` exist - those usecases are tested via `category_persistence_test.go` and `create_batch_test.go`

## Task 5: Final Cleanup - Remaining Hardcoded "draft" Status Strings

### Changes Made (12 occurrences across 5 files)
1. **`delete.go` (line 35)**
   - Added `entity` import
   - Changed: `if risk.Status != "draft"` → `if risk.Status != entity.RiskStatusDraft`

2. **`apply_risk_change.go` (lines 57, 89)**
   - Line 57: `if existingRisk.Status == "draft"` → `if existingRisk.Status == entity.RiskStatusDraft`
   - Line 89: `nextRisk.Status = "draft"` → `nextRisk.Status = entity.RiskStatusDraft`
   - Entity import already present

3. **`apply_risk_change_test.go` (lines 120, 255, 346)**
   - Line 120: Test struct field `Status: "draft"` → `Status: entity.RiskStatusDraft`
   - Line 255: Test assertion `if created.Status != "draft"` → `if created.Status != entity.RiskStatusDraft`
   - Line 346: Test struct field `Status: "draft"` → `Status: entity.RiskStatusDraft`
   - Entity import already present

4. **`openai/ai.go` (line 730)**
   - Added `entity` import (was already imported but not explicitly for this use)
   - Changed: `strings.EqualFold(risk.Status, "draft")` → `strings.EqualFold(risk.Status, entity.RiskStatusDraft)`

5. **`category_persistence_test.go` (lines 187, 200, 223, 236, 284, 299)**
   - Total 6 occurrences (all test struct field initializations)
   - Pattern: `Status: "draft"` → `Status: entity.RiskStatusDraft`
   - Entity import already present

### Verification
- ✅ `go build ./...` — All packages compile successfully
- ✅ `go test ./...` — All backend tests pass (including risk usecase tests)
- ✅ Grep verification: No remaining risk-related `"draft"` strings in codebase
- ✅ Explicit grep of all 5 files shows 12 total uses of `entity.RiskStatusDraft`

### Remaining Excluded Strings (Not Modified - Per Spec)
The following `"draft"` strings correctly remain unchanged (not risk status):
- `internal/handler/form.go` — Form status draft (different entity)
- `internal/handler/working_paper.go` — Working paper status draft (different entity)
- Various incident files — Incident status draft (different entity)

### Completion
✅ All 5 files updated
✅ Build passes
✅ Tests pass
✅ Codebase is now fully consistent with 3-status model and domain constants
✅ No hardcoded risk status strings remain in codebase

## Task 6 - Frontend Types & Status Constants (COMPLETE)

**Changes Made:**
- Updated `types/risk.ts` line 6: `RiskStatus` type changed to `"assessment_draft" | "assessment_in_review" | "approved"`
- Updated `lib/dashboard-insights.ts` line 19: status type updated to match new RiskStatus
- Updated `lib/dashboard-insights.ts` lines 111, 218, 420: defaults from `"draft"` → `"assessment_draft"`
- Updated `lib/risk-history.ts` lines 42, 80: defaults from `"draft"` → `"assessment_draft"`
- Updated `lib/api/risk-register.ts` lines 4, 50: `Exclude<RiskStatus, "draft">` → `Exclude<RiskStatus, "assessment_draft">`
- Updated 7 test files: dashboard-insights.test.ts, risk.test.ts, risk-history.test.ts, risk-report-trend.test.ts, risk-cycle-detail-export.test.ts, meeting-minutes-utils.test.ts, working-paper-linked-risks.test.ts
- All old status strings replaced: "draft"→"assessment_draft", "in_review"/"in_approval"→"assessment_in_review", "rejected"→"assessment_draft"

**Verification:**
- No old risk status strings remain in type/lib files
- All test files updated without human intervention
- RiskReviewStatus (line 98) intentionally left unchanged - this is for review workflow state, not risk entity status

**Note:** Tasks 7-9 (component updates) will have TypeScript errors until completed - that's expected per plan.

## Task 7: Navigation & Redirect Cleanup - COMPLETED

✅ **All items completed successfully:**

1. ✅ Removed "Pemantauan Risiko" menu item (line 20) from `app-navigation.ts`
2. ✅ Removed "/risk/assessment" breadcrumb entry from breadcrumbMap
3. ✅ Deleted `frontend/src/app/(app)/risk/assessment/page.tsx` (the list page)
4. ✅ Verified `assessment/[id]/page.tsx` still exists (form page preserved)
5. ✅ Verified `assessment/components/` folder still exists (component reuse intact)
6. ✅ Added permanent redirect in `next.config.ts`: `/risk/assessment` → `/risk/register`

**Verification results:**
- `grep -rn "Pemantauan" app-navigation.ts` → 0 matches ✓
- `grep -rn "/risk/assessment" app-navigation.ts` → 0 matches ✓
- Assessment form at `/risk/assessment/[id]` remains untouched ✓
- Assessment components folder remains intact ✓

**Impact:**
- Users navigating to `/risk/assessment` will be permanently redirected to `/risk/register`
- Sidebar no longer shows "Pemantauan Risiko" menu item
- Assessment form workflow (`/risk/assessment/[id]`) continues to function for reassessments

## Task 8: Risk Register Pages Status Update - COMPLETED

✅ **All status strings updated in register pages:**

**Changes Made:**
1. **Lines 107-121**: Updated `statusVariant` and `statusLabel` records:
   - Removed entries: `in_approval`, `rejected`
   - Updated keys: `draft` → `assessment_draft`, `in_review` → `assessment_in_review`
   - Updated labels: 
     - `assessment_draft`: "Assessment Draft"
     - `assessment_in_review`: "Dalam Review"
     - `approved`: "Disetujui"

2. **Lines 156-166**: Updated `getRiskRegisterStatusFilter()` function:
   - Now only accepts `"assessment_in_review"` or `"approved"` (removed in_approval, rejected)
   - Returns "all" for unknown values

3. **Line 207**: Updated fallback in `resolveListItemScoreSemantics()`:
   - `risk.status ?? "draft"` → `risk.status ?? "assessment_draft"`

4. **Line 598**: Updated submit draft status:
   - `status: "in_review"` → `status: "assessment_in_review"`

5. **Lines 827-829**: Updated status filter SelectItems:
   - Removed: `in_review`, `in_approval`
   - Updated: `assessment_in_review` with label "Dalam Review"
   - Updated: `approved` with label "Disetujui"

6. **Line 1137**: Updated draft status check:
   - `draft.status === "draft"` → `draft.status === "assessment_draft"`

7. **Line 1170**: Updated delete button visibility condition:
   - `draft.status === "draft"` → `draft.status === "assessment_draft"`

**Verification:**
- ✅ `grep` confirms 0 matches for old status strings in register/page.tsx
- ✅ `grep` confirms 0 matches for old status strings in register/[id]/page.tsx
- ✅ New status strings (assessment_draft, assessment_in_review) verified in place
- ✅ LSP diagnostics: No type errors
- ✅ RiskRegisterStatusFilter type already compatible (from Task 6)

**Note:** register/[id]/page.tsx only contains a redirect to /risk/register/new?id={id}, no status strings present.
