# Monitoring Mitigation Card Design

Date: 2026-05-18
Status: Draft for review
Scope: Frontend-only refinement for the mitigation summary area on the Monitoring page

## Goal

Make the mitigation summary on the Monitoring page more relevant to day-to-day follow-up work by replacing the current generic KPI treatment with a focused mitigation snapshot.

The new summary should help users answer four questions quickly:

1. How many mitigation items are currently being monitored?
2. How many have been completed?
3. How many are overdue?
4. What is the completion rate for the current dataset?

## Current Context

The Monitoring page already contains a `Progress Penanganan` card with:

- a monthly stacked bar chart based on `actionPressureData`
- three small summary boxes below the chart

The current summary boxes are informative but still feel generic:

- `Total Penanganan`
- `Selesai`
- `Overdue`

This works technically, but it does not frame the information as a mitigation-focused operational snapshot.

## Recommended Approach

Keep the existing data source and chart, but redesign the summary area under the chart into a tighter mitigation-only summary block.

The recommendation is to preserve the chart as context and reframe the lower summary into:

- `Total mitigasi aktif`
- `Mitigasi selesai`
- `Mitigasi overdue`

Then add `completion rate` as a secondary element, not as a fourth primary card.

This keeps the hierarchy simple:

- three primary metrics for quick scanning
- one secondary completion signal for context

## Why This Approach

This approach is recommended because it:

- stays aligned with the Monitoring page purpose, which is operational follow-up
- uses terminology that is more specific to mitigation work
- avoids mixing mitigation progress with broader risk workflow states
- keeps the current backend dependency unchanged, reducing implementation risk

## Alternative Approaches Considered

### Option A: `Selesai`, `Belum selesai`, `Overdue`

Pros:

- easy to understand
- operationally clear at first glance

Cons:

- `belum selesai` is too broad and can hide useful distinctions
- less direct than a clear active-total anchor

### Option B: `Selesai bulan ini`, `Overdue`, `Rata-rata penyelesaian`

Pros:

- more analytical
- useful for trend reading

Cons:

- weaker as a daily monitoring snapshot
- less stable if the current month has low activity

### Option C: Recommended

`Total mitigasi aktif`, `Mitigasi selesai`, `Mitigasi overdue`, with `completion rate` as supporting context.

Pros:

- best balance of clarity and relevance
- directly supports scan-first monitoring behavior
- easy to compute from current data

Cons:

- requires an explicit definition of what is counted as `aktif`

## Data Definition

Use the existing `actionPressureData` dataset that powers the monthly mitigation chart.

For this design, `mitigasi aktif` means the total mitigation items represented in the currently loaded chart dataset for the selected monitoring window. It is a reporting total for the visible dataset, not a separate workflow status from another endpoint.

Definitions:

- `Total mitigasi aktif` = sum of `mitigationsCompleted + overdueMitigations`
- `Mitigasi selesai` = sum of `mitigationsCompleted`
- `Mitigasi overdue` = sum of `overdueMitigations`
- `Completion rate` = `mitigationsCompleted / total mitigasi aktif`

If `total mitigasi aktif` is `0`, completion rate must render as `0%` and avoid division errors.

## UI Structure

Inside the existing `Progress Penanganan` card:

1. Keep the card title and chart section.
2. Replace the current generic summary row with a mitigation-focused summary row.
3. Render three equal summary tiles:
   - `Total mitigasi aktif`
   - `Mitigasi selesai`
   - `Mitigasi overdue`
4. Render a supporting completion section below the tiles:
   - label: `Completion rate`
   - percentage text
   - thin progress bar

## Visual Direction

Preserve the existing Monitoring page visual language. This is a refinement, not a redesign.

Summary tiles should follow these rules:

- `Total mitigasi aktif` uses a neutral tone
- `Mitigasi selesai` uses the current success tone
- `Mitigasi overdue` uses the strongest alert emphasis
- all three tiles keep equal visual weight, but overdue gets stronger semantic color

The completion area should feel secondary:

- smaller label
- restrained text
- thin bar instead of a large fourth stat tile

## Responsive Behavior

Desktop:

- three tiles in one row
- completion section below the row

Tablet and mobile:

- tiles wrap into one or two columns as needed
- spacing remains stable
- completion section stays below tiles and spans full width

## Empty and Error States

If no mitigation data is available:

- keep the card visible
- render the existing empty-state tone
- replace metric values with neutral placeholders or zero values
- include copy that explains there is no mitigation activity for the loaded period

If data loading fails:

- do not collapse the layout
- preserve the chart/card shell
- show the same existing fallback style used elsewhere in Monitoring where possible

## Implementation Notes

Expected implementation surface:

- update the mitigation summary area in `frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx`
- do not change API contracts
- do not move the chart to a different page section
- do not introduce a new KPI section above the monitoring content

## Testing Expectations

Implementation should be validated with:

- frontend lint for the touched file
- production build for the frontend
- visual spot check on desktop and mobile layout
- manual verification for:
  - non-zero data
  - all-zero data
  - overdue-heavy data

## Out of Scope

The following are intentionally excluded:

- backend API changes
- new dashboard endpoints
- filtering mitigation metrics by custom date range
- adding separate KPI cards at the top of the Monitoring page
- redesigning the monthly chart itself

## Open Decisions Resolved

The design resolves the earlier open choices as follows:

- focus area: mitigation only
- primary metrics: three mitigation summary tiles
- supporting metric: completion rate as secondary progress element
- source data: current mitigation chart dataset

## Handoff Summary

This design keeps the current chart and data source intact, but reframes the summary block into a more relevant mitigation snapshot for monitoring users. The result should feel more operational, more specific, and easier to scan without requiring backend changes.
