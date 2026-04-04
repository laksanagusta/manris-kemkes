# Decisions — dashboard-enhancement

## [2026-04-04] Initial Architecture Decisions

### Wave Execution Order
1. Wave 1 (parallel): T1 backend entities, T2 TS types, T3 heatmap extraction
2. Wave 2 (parallel, after T1): T4-T7 backend endpoints
3. Wave 3 (parallel, after T1+T2+T3 complete): T8-T12 frontend components
4. T13 (sequential, after T8-T12): Layout polish
5. Final Wave (parallel, after T13): F1-F4 reviews

### Component Placement
- Risk Exposure Score KPI: 5th card in KPI row, `lg:grid-cols-5`, `md:grid-cols-3` (3+2)
- Top Risks Panel: `lg:col-span-3` in new row below Heatmap/Executive Alerts  
- Risk Movement Snapshot: `lg:col-span-2` paired with Top Risks (3:2 split)
- Analisis Lanjutan section: Inserted between 2-col trend grid and Drilldown Filter Banner in Reports

### Data Sources
- Exposure Score: Frontend-only, uses `weightFor()` on existing risk trend data
- Top Risks: Existing `/api/v1/dashboard/top-risks` endpoint (never wired to frontend)
- Movement Snapshot: Uses `buildMovementSnapshotData()` with existing risk comparison data
- Heatmap Velocity: New endpoint `/api/v1/dashboard/heatmap-velocity`
- Overdue Timeline: New endpoint `/api/v1/dashboard/overdue-mitigations-timeline`
- KRI Breach: New endpoint `/api/v1/dashboard/kri-breach-summary`
- Unit Response Time: New endpoint `/api/v1/dashboard/unit-response-time`

### KRI Threshold Logic
- Simplified: all KRIs are "higher is worse"
- warning = actual within 80-100% of threshold
- breach = actual > threshold
