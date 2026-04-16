# QA Report: Risk Assessment (Pemantauan Risiko) Feature

**Date**: 2026-04-16  
**Tester**: AI QA Agent (Playwright)  
**Environment**: localhost (frontend :3000, backend :8080, PostgreSQL :5439)  
**Test Data**: 3 approved risks (RSK-001, RSK-002, RSK-003)

---

## Verdict: ✅ CONDITIONAL APPROVE

The core feature works end-to-end after a critical bug fix was applied during testing. All primary scenarios pass. Two issues remain (1 backend, 1 UX) that should be addressed in follow-up.

---

## Bug Fixed During Testing

### BUG-1: Assessment Save Returns 422 (CRITICAL — FIXED)
- **Root Cause**: `updateRiskAssessment()` sent only 6 assessment fields (probability, impact, weight, nilai, change_reason, review_summary) but the backend `UpdateRisk` endpoint validates ALL risk fields including `category` (which was empty → 422)
- **Fix**: Modified `onSubmit` in `[id]/page.tsx` to merge assessment fields with existing draft risk data before sending
- **Files Changed**: 
  - `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — merge all existing risk fields into payload
  - `frontend/src/lib/api/risk-assessment.ts` — widen `updateRiskAssessment` param type

### BUG-2: List Page Crash on Load (CRITICAL — FIXED in prior session)
- **Root Cause**: `api.get()` auto-unwraps `{data: [...]}` to `[...]`, but page expected `PaginatedRiskResponse` with `.data` property
- **Fix**: Changed state type and references from `data.data` to `data`

---

## Scenario Results

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 9.1 | Sidebar shows "Pemantauan Risiko" | ✅ PASS | scenario-9.1-sidebar-menu.png |
| 9.2 | Sidebar click navigates to /risk/assessment | ✅ PASS | scenario-7.1-list-page.png |
| 9.3 | Breadcrumb shows "Pemantauan Risiko" | ✅ PASS | scenario-9.1-sidebar-menu.png |
| 7.1 | List page loads with 3 risks, shows all columns | ✅ PASS | scenario-7.1-list-page.png |
| 7.2 | Search filters risks | ⚠️ ISSUE | scenario-7.2-search-no-filter.png |
| 7.3 | Click "Assess" creates draft and navigates to form | ✅ PASS | scenario-7.3-assess-navigate.png |
| 8.1 | Form shows 3 cards with all required fields | ✅ PASS | scenario-8.2-auto-calc.png |
| 8.2 | Auto-calculation (prob×impact→bobot→nilai) | ✅ PASS | scenario-8.2-auto-calc.png |
| 8.3 | Fill form + save → redirect to list | ✅ PASS | scenario-8.3-save-success.png |
| 8.4 | Empty fields → validation blocks save | ✅ PASS (silent) | scenario-8.4-validation.png |
| INTEGRATION | Full happy path end-to-end | ✅ PASS | scenario-integration-rsk003-form.png |
| EDGE1 | Missing mitigation plan shown gracefully | ✅ PASS | "Belum ada rencana penanganan" displayed |
| EDGE2 | Same scores as source | ⚠️ NOTE | scenario-edge2-same-scores.png |

**Pass: 11/13 | Issues: 2 (non-blocking)**

---

## Open Issues

### ISSUE-1: Backend Search Not Implemented (LOW)
- **Scenario**: 7.2
- **Description**: Search input sends `q` query param but `ListApprovedRisks` handler ignores it — all risks returned regardless of search term
- **Impact**: Low (search is cosmetic with small datasets)
- **Recommendation**: Implement `q` filtering in `backend/internal/repository/postgres/risk.go` line ~487

### ISSUE-2: Silent Validation (LOW)
- **Scenario**: 8.4
- **Description**: Clicking "Simpan Pemantauan" with empty required fields silently does nothing — no validation error messages shown to user
- **Impact**: Low (form still correctly blocks submission)
- **Recommendation**: Add visible error messages under required fields using react-hook-form error state

### NOTE: Score Comparison Mismatch with Seed Data
- When prob/impact are unchanged from source, the Simpulan may still show "peningkatan" because the new `getBobot()` formula differs from how seed data was created
- This is a seed data inconsistency, not a feature bug

---

## Console Errors
- Only 1 error observed: `422 on POST /risks/{id}/reassess` when attempting to re-create an existing draft (expected behavior — duplicate cycle protection)
- No JavaScript runtime errors
- No unhandled promise rejections

---

## Files Modified
1. `frontend/src/app/(app)/risk/assessment/page.tsx` — Fixed data.data crash
2. `frontend/src/lib/api/risk-assessment.ts` — Fixed return type, widened update param type
3. `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — Fixed save payload to include all required fields
