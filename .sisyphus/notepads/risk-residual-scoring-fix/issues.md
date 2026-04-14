# Issues — risk-residual-scoring-fix

## FIXED: "Kode Risiko" label mislabeled as "Probabilitas (Residual)"
- **File**: `frontend/src/app/(app)/risk/register/new/page.tsx:1930`
- **Severity**: Medium (UI bug)
- **Found by**: F4 Scope Fidelity Check
- **Issue**: During Task 9 label renaming ("Probabilitas" → "Probabilitas (Residual)"), the wrong label was changed. The `riskCode` Controller field's label "Kode Risiko" was incorrectly renamed to "Probabilitas (Residual)".
- **Fix**: Reverted label back to "Kode Risiko"
- **Status**: ✅ FIXED

## OPEN (Low): Dead `reviewedBy` parameter in risk-approval-line.ts
- **File**: `frontend/src/lib/risk-approval-line.ts:15`
- **Severity**: Low (dead code, non-blocking)
- **Issue**: `reviewedBy?: string | null` parameter is never passed by any caller. The fallback path is never triggered.
- **Fix**: Remove parameter and simplify function. Optional cleanup.
