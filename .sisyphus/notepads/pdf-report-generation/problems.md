# Problems — pdf-report-generation

## [2026-04-04] No blocking problems at start of implementation

All research gaps were resolved during planning:
1. Dashboard usecases not cycle-aware → resolved: compute KPIs in-memory
2. Incidents/KRIs lack cycle field → resolved: filter via linked risk IDs
3. maroto v1 vs v2 → resolved: use v2 exclusively
4. go-echarts browser dep → resolved: use vicanso/go-charts
5. Trend multi-cycle data → resolved: iterate ListByCycle for recent cycles
6. Empty cycle → resolved: return 404
