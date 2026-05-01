# Task 7 — Risk Appetite & Mandatory Mitigation

## Status: IN PROGRESS

**Goal:** Enforce KMK risk appetite rules (threshold: inherentScore >= 10) and mandatory mitigation for high risks. Use inherentScore (not nilai). All variable names in English. No migration for static data — hardcode in Go.

## Steps

- [ ] Step 1: Add domain functions (ResolveRiskAppetite, IsRiskUtama)
- [ ] Step 2: Add ResidualAcceptanceReason to Risk entity
- [ ] Step 3: Update risk repository persistence (add column)
- [ ] Step 4: Update create/update usecases with validation
- [ ] Step 5: Add frontend helpers (resolveRiskAppetite, isRiskUtama)
- [ ] Step 6: Update frontend types and form
- [ ] Step 7: Run backend + frontend verification
- [ ] Step 8: Commit

## Notes

- Threshold: `inherentScore >= 10` → "di_atas_batas", else "dalam_batas" (per KMK appetite matrix)
- Risk utama: `inherentScore >= 10` → requires at least one mitigation OR valid treatment (avoid/transfer/accept)
- Risk appetite: auto-calculate as advisory, user can override, override stored as-is
- Residual acceptance reason: required when target still above appetite (inherentScore >= 10)