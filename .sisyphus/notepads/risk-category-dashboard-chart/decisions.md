# Decisions — risk-category-dashboard-chart

## [2026-04-03] Architectural Decisions

- Backend maps blank DB category values to `uncategorized` at the usecase layer (not SQL layer for task 1; task 2 also collapses in SQL via COALESCE)
- Frontend maps `uncategorized` slug → `Tanpa Kategori` display label (never in backend)
- Endpoint is GET-only, parameter-free: `GET /api/v1/dashboard/risk-categories`
- Response ordering: count DESC, then category ASC for ties
- Widget placement: new full-width row between Heatmap/Alerts and Trend/Incident rows
- Chart type: horizontal bar chart using Recharts `layout="vertical"` 
- No drilldown, no click handlers, no tooltips implying navigation
