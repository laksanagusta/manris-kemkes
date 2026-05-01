# Task 5 — KMK Batch B: Likelihood Assessment Wizard

## Status: ✅ COMPLETE

## Summary

Backend:
- `000047_likelihood_assessments` migration (table + column in risks)
- `LikelihoodAssessment` entity with `Validate()` and `ResolveLikelihoodLevel()`
- 24 unit test cases (all passing) — covers all KMK thresholds
- Postgres repository with UpsertByRiskID
- UpsertUseCase + GetByRiskIDUseCase
- HTTP handler: POST /likelihood-assessments, GET /likelihood-assessments/:riskId
- `LikelihoodAssessmentID` added to Risk entity + all SELECT queries
- Bootstrap wired, routes registered

Frontend:
- Types: `LikelihoodAssessment`, `LikelihoodAssessmentInput`, `UpsertLikelihoodAssessmentResponse`
- API client: `upsertLikelihoodAssessment`, `getLikelihoodAssessmentByRiskId`
- `LikelihoodAssessmentWizard` component — 5 method tabs with KMK thresholds
- Frontend build: ✅ PASS

## Verification

```bash
cd backend && go test ./...          # ✅ PASS
cd ../frontend && npm run build    # ✅ PASS
```

## Commit

```
feat(backend+frontend): add KMK likelihood assessment wizard (Task 5)
17 files changed, 1592 insertions(+), 13 deletions(-)
```
