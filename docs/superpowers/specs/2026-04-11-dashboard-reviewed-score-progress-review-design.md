# Dashboard Reviewed Score, Latest Progress, and Review Confirmation Design

## Goal

Improve the dashboard and risk register workflow in four focused ways:

1. Replace residual-score reporting with reviewed-score reporting where the UI currently compares inherent vs residual values.
2. Add a chart that shows latest working-paper approval progress per organization.
3. Align top-risk badge colors with the same risk-level semantics used by the heatmap.
4. Add an explicit confirmation dialog before a user submits a risk for review.

The goal is consistency: score semantics, color semantics, and workflow behavior should all match what users already see elsewhere in the product.

## Current State

Relevant current frontend files:

- `frontend/src/lib/dashboard-insights.ts`
- `frontend/src/lib/dashboard-insights.test.ts`
- `frontend/src/lib/risk.ts`
- `frontend/src/app/(app)/reports/page.tsx`
- `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`
- `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`
- `frontend/src/app/(app)/overview/_components/risk-heatmap.tsx`
- `frontend/src/app/(app)/risk/register/new/page.tsx`
- `frontend/src/app/(app)/risk/register/page.tsx`
- `frontend/src/app/globals.css`

Observed behavior in current code:

- `buildInherentResidualTrendData` uses `risk.targetScore` as the residual value.
- `InherentResidualTrend` labels the second series as `Residual`.
- `TopRisksPanel` uses a local `scoreColor()` threshold mapping that does not follow the same level semantics as the heatmap.
- `RiskHeatmap` derives colors from risk-level semantics and maps those levels to `heatmap-*` classes.
- `risk/register/new/page.tsx` sends `Ajukan review` directly into the submit path without a confirmation dialog.

## Recommended Product Direction

Use a `single-semantic-source` direction for score interpretation and visual status.

This means:

- report charts should use the same reviewed-score rules already defined in shared risk semantics
- risk-level colors should come from shared risk-level utilities, not local thresholds per widget
- workflow-changing actions should ask for confirmation before execution when they move the item into a review process

This keeps executive reporting, operational cards, and approval flow behavior aligned.

## Design Decisions

### 1. Inherent vs Reviewed Score

The current `Inherent vs Residual Score` chart becomes `Inherent vs Reviewed Score`.

The second series should no longer use `targetScore`.
It should use reviewed-score semantics that match existing shared logic:

- reviewed values are valid only when the risk status is `approved`
- the reviewed score bundle must be complete
- partial reviewed data must not be treated as a valid reviewed score

This reuses the same interpretation already encoded in `resolveRiskScoreSemantics` and avoids a chart that mixes target-state intention with reviewed-state reality.

#### UI changes

- title: `Inherent vs Reviewed Score`
- legend: `Inherent` and `Reviewed`
- tooltip labels use `Reviewed`
- helper output names can remain internal if that minimizes churn, but visible copy must say `Reviewed`

### 2. Latest Working-Paper Progress per Organization

Add a new chart that shows approval progress for the latest working paper per organization.

#### Metric definition

For each organization:

1. identify its latest cycle or working-paper grouping from the same risk dataset already used by the frontend analytics
2. gather all risks in that latest cycle for that organization
3. compute:
   - `approvedCount`
   - `totalCount`
   - `approvedPercent = approvedCount / totalCount * 100`

This chart answers: `How far along is each organization on its most recent working paper?`

#### Presentation

Recommended visual: compact bar chart.

Each row or bar should include:

- organization name
- approved percentage
- tooltip or supporting text with `approvedCount / totalCount`

This chart does not invent a new backend workflow concept. It stays grounded in current risk status data.

### 3. Top Risk Color Consistency

`TopRisksPanel` stops using a private score-threshold mapping for badge colors.

Instead, it should derive a risk level using the same semantics family used by the heatmap and shared risk helpers.

#### Required consistency rule

If a risk is visually `rendah` or `sangat rendah` in heatmap semantics, its label or badge in top risks must use the same green-family styling rather than warning orange.

#### Source of truth

Shared logic comes from `frontend/src/lib/risk.ts`:

- `getRiskLevelFromNilai`
- `getRiskLevelLabel`
- `levelToColor`

The heatmap may keep local class mapping for matrix cells if needed, but top-risk badges should not maintain an independent threshold system.

### 4. Submit-for-Review Confirmation

The `Ajukan review` action in `frontend/src/app/(app)/risk/register/new/page.tsx` uses an explicit confirmation dialog.

#### Interaction flow

1. User clicks `Ajukan review`.
2. Existing readiness checks run first.
   - reviewer selected
   - form ready for finalization
3. If validation passes, open a confirmation dialog.
4. User confirms.
5. Existing submit flow runs.

#### Dialog pattern

Use `AlertDialog` and follow the nearby risk-register reassessment confirmation pattern in:

- `frontend/src/app/(app)/risk/register/page.tsx`

This is the closest existing pattern because it confirms a workflow transition before executing a real action.

The dialog communicates that the risk will be submitted into the review process and that the selected reviewer and approval line will be used.

## File-Level Design

### `frontend/src/lib/dashboard-insights.ts`

Changes:

- update `buildInherentResidualTrendData` so the second series reflects reviewed semantics rather than `targetScore`
- add a new helper that builds `latest approved progress per organization` chart data

Guidance:

- keep data shaping in this file, not in chart components
- return small UI-ready records
- keep grouping/sorting deterministic

### `frontend/src/lib/dashboard-insights.test.ts`

Add and update tests for:

- reviewed score replacing target score in trend data
- fallback behavior when reviewed bundle is partial
- latest-cycle progress grouping per organization
- multiple organizations with different latest cycles
- organizations with zero approved items

### `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`

Changes:

- rename visible copy from `Residual` to `Reviewed`
- update title and legend text
- keep existing chart structure unless key renaming is required by the helper output

### `frontend/src/app/(app)/reports/page.tsx`

Changes:

- continue to derive trend data from `dashboard-insights`
- derive new organization-progress data with `useMemo`
- render the new chart in the reports analytics area

### New report component

Recommended new file:

- `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx`

Responsibilities:

- render approval progress by organization
- show percentage clearly
- provide tooltip/detail for raw counts
- show an empty state when no grouped data exists

### `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`

Changes:

- remove local `scoreColor()` threshold logic
- derive risk level from shared semantics
- use shared color utility for label or badge styling

### `frontend/src/app/(app)/risk/register/new/page.tsx`

Changes:

- add dialog-open state for submit-review confirmation
- change `Ajukan review` button so it opens the dialog instead of submitting immediately
- keep the real submit call inside the dialog confirm action
- preserve current submit path after confirmation, including `/approvals/submit`

### `frontend/src/app/(app)/risk/register/page.tsx`

This file is not expected to change functionally, but it is the reference pattern for confirmation dialog structure.

## Edge Cases

### Reviewed score edge cases

- Approved risk with complete reviewed bundle: use reviewed score.
- Approved risk with partial reviewed bundle: do not mix fields; fall back to inherent semantics.
- Non-approved risk with reviewed draft values: keep inherent semantics.
- Explicit zero reviewed score values must remain valid.

### Organization progress edge cases

- If an organization has no risks in the latest cycle, do not render a misleading bar from empty input.
- If latest cycle exists but zero items are approved, show `0%` and keep raw counts visible.
- Latest-cycle selection must be deterministic and follow current data ordering rules already used in the app.

### Confirmation edge cases

- Prevent double-submit while confirmation action is pending.
- Do not open the dialog when prerequisite validation already fails.
- If approval submission fails after the risk save step, preserve existing error handling behavior.

## Testing Strategy

### Automated tests

Primary coverage should go into:

- `frontend/src/lib/dashboard-insights.test.ts`

Focus on behavior, not implementation details:

- reviewed trend semantics
- latest approved progress aggregation
- color-level semantic mapping if extracted into testable helpers

### Validation checks

- frontend type checks and build must pass
- changed files must be free of diagnostics

### Manual QA

Verify:

1. reports chart title and legend now say `Reviewed`
2. reviewed series reflects approved reviewed values only
3. organization progress chart shows approved percentage for the latest cycle per organization
4. top-risk low-severity badge is green and matches heatmap meaning
5. clicking `Ajukan review` opens confirmation dialog first
6. confirming dialog triggers the existing submit-for-review flow

## Risks and Constraints

- The main semantic risk is latest-cycle selection if cycle fields are inconsistent across organizations. The implementation should reuse current frontend cycle semantics rather than invent a new ordering rule.
- This work should remain frontend-scoped. No database or API contract change is required unless implementation reveals a missing latest-cycle discriminator.
- Visual consistency is more important than preserving old local badge thresholds.

## Recommended Implementation Order

1. update chart semantics and tests in `dashboard-insights`
2. update `Inherent vs Reviewed` chart copy
3. add latest organization progress helper and component
4. align top-risk badge color semantics with shared utilities
5. add review confirmation dialog in risk register form

## Out of Scope

- backend endpoint redesign
- database schema changes
- broader dashboard information architecture refactor
- approval workflow redesign beyond pre-submit confirmation
