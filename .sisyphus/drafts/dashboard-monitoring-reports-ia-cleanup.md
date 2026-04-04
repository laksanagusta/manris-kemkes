# Draft: Dashboard Monitoring Reports IA Cleanup

## Requirements (confirmed)
- [plan status check]: user asked whether `.sisyphus/plans/dashboard-monitoring-reports-ia-cleanup.md` is fully complete
- [missing analytics question]: user asked why the risk category chart is not present

## Technical Decisions
- [mode]: investigate as planning/review work, not implementation

## Research Findings
- [plan file]: tasks 1-7 are checked complete, final verification F1-F4 remains unchecked
- [ia plan scope]: `.sisyphus/plans/dashboard-monitoring-reports-ia-cleanup.md` never mentions a risk category chart/module
- [rendered frontend]: `/frontend/src/app/(app)/overview/page.tsx` and `/frontend/src/app/(app)/reports/page.tsx` do not render a dedicated risk category chart
- [orphaned data]: `/frontend/src/lib/risk-report-trend.ts` computes `pieData` for risk level distribution, but `/frontend/src/app/(app)/reports/page.tsx` only consumes `trendData` and discards `pieData`
- [domain model]: `/frontend/src/types/risk.ts` has `riskSource` but no dedicated risk category classification field for a true "jenis kategori risiko" chart
- [risk-category plan scope]: `.sisyphus/plans/risk-category-addition.md` explicitly excludes dashboard/chart redesign in Metis Review and Must NOT Have, and marks `Dashboard widgets/top-risk charts redesign` as `NO` in the surface scope matrix

## Open Questions
- [chart meaning]: whether user means the unused pie/donut for risk level distribution or a new true risk-category chart by classification type
- [scope intent]: whether the missing chart should be treated as required follow-up scope

## Scope Boundaries
- INCLUDE: plan completeness review, scope-gap identification, follow-up planning if needed
- EXCLUDE: source-code implementation
