# Dashboard & Report Insights Design

## Goal

Improve the `overview` and `reports` pages so executive users can answer three questions quickly:

1. What is getting worse?
2. Which units need attention now?
3. What actions or decisions are needed this period?

The target primary audience is `pimpinan`, so the pages should prioritize executive signals over operational detail.

## Current State

Existing frontend pages:

- `frontend/src/app/(app)/overview/page.tsx`
- `frontend/src/app/(app)/reports/page.tsx`
- `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx`

Existing dashboard/report visuals:

- KPI cards
- 5x5 risk heatmap
- top risks list
- stacked risk trend chart
- pie chart for current risk distribution
- cycle detail comparison table/report

Existing backend endpoints already used by these pages:

- `GET /dashboard/summary`
- `GET /dashboard/heatmap`
- `GET /dashboard/top-risks`
- `GET /dashboard/risk-review-summary`
- `GET /risks`
- `GET /risks/cycle-snapshot?cycle=YYYY-H1`

## Recommended Product Direction

Use an `Executive Summary First` dashboard style with light portfolio analysis support.

This means:

- `overview` becomes the executive cockpit for live signals and priorities
- `reports` becomes the analytical and cycle-comparison area
- charts should favor ranking, movement, and trend direction over generic composition

## Overview Page Design

`overview` should be arranged in four layers.

### 1. KPI Row

Keep the KPI row, but orient it around executive action:

- `High + Extreme Risks`
- `Overdue Mitigations`
- `Active Incidents` or `Incidents This Period`
- `Risk Exposure Score`

`Risk Exposure Score` is a weighted count, not a raw total.

Suggested weights:

- low = 1
- medium = 2
- high = 3
- extreme = 5

### 2. Primary Insight Row

The first analytical row should hold the most decision-useful charts:

- `Risk Exposure Trend` using a line chart
- `Incident vs Mitigation Closure` using a combo chart

`Risk Exposure Trend` should emphasize `high` and `extreme` counts, and optionally total weighted exposure.

`Incident vs Mitigation Closure` should compare:

- incidents created
- mitigations completed
- overdue mitigations

This chart is important, but the data model is not fully ready yet, so it is a phase-two item.

### 3. Decision Row

This row should support prioritization:

- `Top 5 Unit by Exposure` using a horizontal bar chart
- `Executive Alerts` using a compact ranked list

`Executive Alerts` should highlight items such as:

- new extreme risks
- risks that increased level since the last cycle
- mitigations overdue more than 30 days
- units with no cycle update

### 4. Support Row

Keep the existing heatmap, but make it a support visual rather than the only main insight.

- left: `Heatmap Risiko`
- right: `Risk Movement Snapshot`

`Risk Movement Snapshot` should show:

- new
- up
- down
- stable
- closed or removed

## Reports Page Design

`reports` should shift from general export-plus-charting into a clearer analytical reporting page.

### Keep

- export section
- risk cycle detail report table
- period/cycle filtering

### Change

Replace weak composition visuals with ranking and movement visuals.

Recommended content order:

1. Export section
2. `Risk Movement Report` as the main cycle-comparison chart
3. `Top Unit Exposure` as a horizontal bar chart
4. `Risk Trend Report` focused on high/extreme movement across semesters
5. `RiskCycleDetailReport` as the detailed drilldown

### Pie Chart Replacement

The current pie chart for risk distribution is lower-value for executives because it shows composition without ranking or urgency.

Replace it with `Top Unit Exposure`.

Why:

- ranking is easier to read than slice proportions
- it shows where leadership attention should go
- it better supports follow-up filtering and drilldown

## Metric Definitions

### Risk Exposure Score

Weighted sum of risks by severity:

- low = 1
- medium = 2
- high = 3
- extreme = 5

This metric should be available at overall and per-unit level.

### Risk Movement

Cycle-to-cycle changes should classify risks as:

- `new`
- `up`
- `down`
- `stable`
- `closed` or `removed`

This should be computed by comparing the current cycle with the previous cycle.

### Action Pressure

This is a combined indicator for executive prioritization. It should eventually consider:

- high/extreme risks
- overdue mitigations
- active incidents

This is useful for ranking units and generating executive alerts.

## API and Data Strategy

### Data Already Available

These charts can be built immediately from existing endpoints and frontend aggregation:

- `Risk Exposure Trend` from `GET /risks`
- `Top 5 Unit by Exposure` from `GET /risks`
- `Risk Movement Between Cycles` from `GET /risks/cycle-snapshot`
- `Top Risks` with richer movement badges from `GET /dashboard/top-risks` plus cycle comparison data

### Data That Should Move to Backend Aggregation

For performance and cleaner ownership, executive chart calculations should eventually move out of the client and into backend endpoints.

Recommended future endpoints:

- `GET /dashboard/exposure-trend?interval=month&window=6`
- `GET /dashboard/exposure-by-unit?cycle=2026-H1&limit=5`
- `GET /dashboard/risk-movements?from=2025-H2&to=2026-H1`
- `GET /dashboard/action-pressure?interval=month&window=6`
- `GET /dashboard/executive-alerts?limit=10`

### Why Backend Aggregation

- reduces repeated client-side transformations
- improves dashboard load time as data volume grows
- keeps metric definitions consistent across pages
- simplifies drilldown and export alignment later

## Recommended Implementation Order

Prioritize high-value, low-effort changes first.

### Phase 1

1. Replace the `reports` pie chart with `Top Unit Exposure`
2. Add `Risk Movement Report` to `reports`
3. Upgrade `overview` top risks with movement and overdue badges
4. Refocus `overview` risk trend on `high` and `extreme`

### Phase 2

1. Add backend support for `Incident vs Mitigation Closure`
2. Add `Executive Alerts`
3. Add dedicated aggregated dashboard endpoints

## File-Level Change Targets

Most immediate frontend work will happen in:

- `frontend/src/app/(app)/overview/page.tsx`
- `frontend/src/app/(app)/reports/page.tsx`
- `frontend/src/lib/` for small chart transformation helpers if needed

Most future backend work will likely happen in:

- `backend/internal/handler/http/risk.go`
- `backend/internal/usecase/risk/`
- `backend/internal/repository/postgres/risk.go`
- incident and mitigation-task repositories for action-pressure style reporting

## Interaction Design

Recommended interactions:

- clicking a unit bar filters to risks for that unit
- clicking a trend point filters to risks in that period
- tooltips should include current value and change versus previous period
- top risks should include movement badges such as `Naik level`, `Baru`, or `Overdue`

## Error Handling and Empty States

Charts should degrade cleanly when data is missing.

- show empty states instead of zero-looking charts when no period data exists
- show fallback copy when comparison cycles are unavailable
- keep KPI cards usable even when secondary charts fail
- prefer partial rendering over blocking the whole page on one failed chart

## Testing and Verification

Implementation should verify:

- transformation logic for exposure scoring
- transformation logic for cycle movement classification
- chart rendering with empty, partial, and populated datasets
- stable behavior when organization or cycle filters change

Minimum verification after implementation:

- `npm run lint` in `frontend`
- targeted UI check for `overview` and `reports`
- backend tests if new aggregation endpoints are added

## Decision Summary

The most valuable next implementation step is:

1. replace the `reports` pie chart with `Top Unit Exposure`
2. add a cycle `Risk Movement Report`
3. enrich `overview` top risks and trend logic for executive use

This path gives noticeable executive value quickly while staying aligned with the current codebase and available data.
