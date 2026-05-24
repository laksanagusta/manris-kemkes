# Analisis Kinerja & Risiko Design

Date: 2026-05-24

## Context

Manris already links risks to RO through `risks.ro_id`, and the planning hierarchy contains tujuan, sasaran, IKU, program, kegiatan, and RO. Existing reporting surfaces cover general risk analytics, formal reports, compliance monitoring, and cycle comparison, but they do not yet answer the management question: which performance objectives are most exposed by inherent risk, why, and which mitigations need attention.

This design defines an MVP for an interactive dashboard named **Analisis Kinerja & Risiko**. The module maps performance planning data to approved risk data and mitigation status. It does not generate formal reports or exports in the first version.

## Goals

- Show the relationship between performance planning and risk exposure.
- Rank planning RO by inherent risk exposure.
- Help reviewers and leaders identify RO that need attention because of high inherent score or overdue mitigation.
- Keep the module useful across roles without making separate products for each role.
- Preserve modular backend boundaries so the feature does not become a single monolithic reporting query.

## Non-Goals

- No PDF, Excel, or CSV export in the MVP.
- No AI-generated insight in the MVP.
- No formal report generation in the MVP.
- No KRI or incident correlation in the MVP.
- No residual, target, or monitoring result score analysis in the MVP.
- No rewrite of existing `/reports` analytics.

## Product Shape

Name: **Analisis Kinerja & Risiko**

Route: `/reports/performance-risk`

Breadcrumb: `Laporan > Analisis Kinerja & Risiko`

Page purpose: map inherent risk exposure against the planning hierarchy from tujuan to RO.

The page is an interactive analysis workspace, not a static report. The first screen should focus on summary metrics and RO ranking. Details are loaded when a user selects one planning node or RO.

## MVP User Flow

1. User opens **Analisis Kinerja & Risiko** from the Laporan area.
2. User selects a period, and optionally filters by unit, program/kegiatan, risk level, and mitigation status.
3. The page shows a summary bar:
   - total active/scoped RO,
   - RO with linked approved risks,
   - RO without linked approved risks,
   - RO with high or very high inherent risk,
   - total overdue mitigations.
4. The page shows a ranking table of RO.
5. User clicks a row to open a detail view.
6. Detail view shows planning context, inherent heatmap, linked risks, pending/overdue mitigations, and unit breakdown when the scope spans multiple units.
7. User can enable a toggle to show RO without linked risk.
8. User can inspect unlinked approved risks for the selected period as a data quality signal.

## Scoring Rules

All exposure metrics in this module use `inherent_score`.

Rules:

- `totalExposure`: sum of `inherent_score` for approved risks linked to the RO.
- `avgExposure`: average `inherent_score` for approved risks linked to the RO.
- `highestLevel`: risk level derived from the highest `inherent_score`.
- `highExtremeCount`: count of risks whose inherent-score level is `tinggi` or `sangat_tinggi`.
- `heatmap`: built from inherent `probability` and `impact`, not target or monitoring values.
- `attentionStatus`: derived from inherent-score severity plus mitigation overdue count.

Target score, residual score, monitoring result score, and effective score must not be used for this MVP's exposure ranking. This keeps the module focused on inherent risk exposure against performance planning.

## Core Metrics

Per RO:

- `riskCount`
- `highestInherentScore`
- `highestLevel`
- `totalExposure`
- `avgExposure`
- `highExtremeCount`
- `heatmap`
- `mitigationTotal`
- `mitigationPending`
- `mitigationOverdue`
- `attentionStatus`

Summary:

- `totalRO`
- `linkedRO`
- `unlinkedRO`
- `highOrExtremeRO`
- `totalRisks`
- `unlinkedRisks`
- `totalMitigations`
- `overdueMitigations`

Suggested `attentionStatus` values:

- `critical`: at least one very high inherent risk, or high inherent risk plus overdue mitigation.
- `watch`: high inherent risk, or any overdue mitigation.
- `stable`: linked risks exist but no high-risk or overdue signal.
- `no_risk`: RO exists but has no linked approved risk in the selected period.

## Backend Design

The backend should be modular internally, even if the frontend composes a small number of calls.

Usecases:

- `PerformanceRiskSummaryUseCase`
  - Builds summary cards for the selected period and access scope.
- `PerformanceRiskPlanningMapUseCase`
  - Builds the ranked list of RO/planning nodes.
- `PerformanceRiskDetailUseCase`
  - Builds detail data for a selected RO or planning node.
- `PerformanceRiskUnlinkedUseCase`
  - Lists approved risks in the period that do not have `ro_id`.
- Shared metric builder
  - Computes inherent-score levels, heatmap cells, mitigation counts, and attention status consistently.

Suggested endpoints:

- `GET /api/v1/reports/performance-risk/summary?period=2026-H1&org_id=...`
- `GET /api/v1/reports/performance-risk/nodes?period=2026-H1&org_id=...`
- `GET /api/v1/reports/performance-risk/nodes/:id?period=2026-H1&org_id=...`
- `GET /api/v1/reports/performance-risk/unlinked-risks?period=2026-H1&org_id=...`

For the MVP, `nodes/:id` targets a planning RO id. The naming stays generic so later phases can support higher planning nodes, such as kegiatan, program, IKU, or sasaran, without changing the whole URL shape.

The first frontend version can load `summary` and `nodes` on page load, then lazy-load detail only when a row is selected.

Repository requirements:

- Query planning RO for the selected period and organization scope.
- Join planning hierarchy fields: tujuan, sasaran, IKU, program, kegiatan, and RO.
- Left join approved risks by `risks.ro_id`, `risks.assessment_cycle`, and organization scope.
- Include RO without linked risks.
- Count approved risks without `ro_id` separately.
- Load mitigations for linked risks and classify pending versus overdue.

Important implementation note: existing cycle snapshot flows should be audited because some risk snapshot queries may not currently scan `ro_id`. This module must preserve `ro_id` in any query that feeds performance-risk analytics.

## Frontend Design

Files should follow current Next.js and local API-client patterns.

Suggested additions:

- `frontend/src/app/(app)/reports/performance-risk/page.tsx`
- `frontend/src/types/performance-risk.ts`
- `frontend/src/lib/api/performance-risk.ts`
- `frontend/src/lib/performance-risk.ts`
- focused components under `frontend/src/app/(app)/reports/performance-risk/_components/`

Main UI sections:

- Filter bar
  - period,
  - organization/unit,
  - program/kegiatan,
  - risk level,
  - mitigation status,
  - show RO without risk toggle.
- Summary cards
  - concise executive signals.
- Ranking table
  - default sort by `totalExposure desc`, `highExtremeCount desc`, `mitigationOverdue desc`.
- Detail view
  - planning path,
  - inherent heatmap,
  - linked risk list,
  - pending/overdue mitigation list,
  - unit breakdown for cross-unit scope.
- Data quality panel
  - unlinked approved risks for the selected period.

## Empty And Error States

- Period has no planning RO:
  - Show a clear empty state that the planning structure is not available for the period.
- RO exists but has no linked risks:
  - Treat as data quality or identification insight, not an error.
- Approved risks exist without `ro_id`:
  - Show a data quality panel so reviewer can fix linkage.
- Endpoint error:
  - Preserve filters and show retry affordance.
- Access scope has no selectable unit:
  - Follow existing report scope behavior.

## Access Control

Use the same report scope rules as existing `/reports` pages:

- Global users may inspect global or selected unit scope.
- Non-global users default to their organization scope.
- Explicit organization selection must still be validated server-side.
- Descendant organization access must follow the existing hierarchy service rules.

## Testing Plan

Backend:

- Unit tests for metric builder:
  - inherent score level mapping,
  - total and average exposure,
  - heatmap aggregation,
  - mitigation pending/overdue classification,
  - attention status.
- Usecase tests with fake repositories:
  - includes RO without risk,
  - separates unlinked risks,
  - filters by period and organization scope,
  - never uses target/residual score for exposure.
- Repository/query tests where local patterns support them:
  - `ro_id` join,
  - planning hierarchy fields,
  - approved risk filtering,
  - scoped organization filtering.

Frontend:

- Utility tests:
  - default sorting,
  - empty-state classification,
  - attention status display mapping.
- Page/component tests if current test setup supports them.
- Build and lint verification.

## Rollout

Phase 1 MVP:

- Backend modular usecases and endpoints.
- Frontend page with filters, summary, ranking, detail, heatmap, risk list, mitigation list, and unlinked-risk panel.
- No export, AI, formal report, KRI, incident, or residual-score analysis.

Phase 2 candidates:

- Trend comparison across periods.
- KRI and incident correlation.
- Export or formal report generation from the same modular data.
- AI narrative summary after the metrics are trusted.

## Approval Notes

User-approved decisions from brainstorming:

- Build a dashboard first, not report generation.
- Use a combined model: ranking first, with drill-down by unit and period.
- MVP includes exposure and mitigation data.
- No export in the MVP.
- Name the module **Analisis Kinerja & Risiko**.
- Use `inherent_score` for score-based analysis.
- Keep the backend modular; avoid a single monolithic endpoint.
