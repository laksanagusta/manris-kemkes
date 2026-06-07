# Risk Assessment and Monitoring Redesign

## Context

Manris currently stores risk identity, risk assessment content, monitoring cycle state, versioning, approval status, mitigation plan, and archival behavior mostly around the existing `risks` and mitigation-related tables. That model has worked for the current flow, but it mixes several KMK concepts into one data shape.

The target KMK-aligned model separates:

- **Risiko**: the stable managed risk object.
- **Penilaian risiko**: the formal assessment that forms or revises a risk profile.
- **Pemantauan risiko**: the periodic monitoring evidence and mitigation progress.
- **Rencana mitigasi**: the official mitigation plan from an assessment.
- **Progress mitigasi**: the observed implementation progress during monitoring.

This design follows the product decision that approval workflow is out of scope for now. Finalization directly approves the record.

## Decisions

Use a full refactor, not an incremental compatibility layer.

The target tables are:

- `risks`
- `risk_assessments`
- `risk_assessment_mitigations`
- `risk_monitorings`
- `risk_monitoring_mitigation_progress`

The existing `risk_mitigation_tasks` concept will be removed from the target model. Mitigation execution evidence will live in `risk_monitoring_mitigation_progress`.

Before implementation, Manris must present a field-by-field schema impact list to the user covering:

- fields added to each new table,
- fields kept in `risks`,
- fields moved out of `risks`,
- fields removed or deprecated,
- existing mitigation/task fields moved, renamed, or dropped.

No schema edit should happen until that field list is reviewed.

## KMK Timing Model

Penilaian risiko is annual by default. It produces the initial risk profile for a fiscal year and is informed by the prior year's Q4 monitoring and review.

Pemantauan risiko is periodic. The default monitoring rhythm is quarterly, with optional monthly monitoring if the UPR needs tighter tracking.

Semester reporting is derived, not stored as a separate assessment period:

- H1 uses Q1 and Q2 monitoring plus approved assessment revisions up to Q2.
- H2 uses Q3 and Q4 monitoring plus approved assessment revisions up to Q4.

## Data Model

### `risks`

Stores stable risk identity only.

Examples:

- code,
- title,
- category,
- organization,
- objective or planning links,
- risk owner,
- control owner,
- lifecycle status such as active or retired.

It should not be the source of truth for probability, impact, score, treatment option, target score, or assessment-cycle state.

### `risk_assessments`

Stores formal assessment snapshots that form or revise the risk profile.

Assessment types:

- `initial_profile`: first approved profile assessment for a year.
- `profile_revision`: approved profile change inside the year.
- `annual_rollover`: new year assessment created from the prior year's final condition.
- `retirement_review`: formal decision to retire a risk.

Statuses for this phase:

- `draft`
- `approved`

There is no `in_review` status in this refactor phase.

Period model:

- annual assessment: `period_type = annual`, `period_key = 2026`
- quarterly revision: `period_type = quarter`, `period_key = 2026-Q2`
- monthly revision if needed: `period_type = month`, `period_key = 2026-06`

Each assessment can link to `previous_assessment_id`.

### `risk_assessment_mitigations`

Stores official mitigation plans for one assessment.

These are the planned treatments that appear in the risk profile and formal reports.

If the mitigation plan changes materially, users create a profile revision through `risk_assessments`. They do not mutate an already finalized assessment in place.

### `risk_monitorings`

Stores periodic monitoring results.

Examples:

- monitoring period,
- linked baseline assessment,
- latest condition,
- event or LED summary,
- observed probability,
- observed impact,
- trend: up, down, stable,
- effectiveness conclusion,
- recommendation to revise the profile,
- finalization metadata.

Monitoring can capture observed score movement without automatically changing the official profile. If the monitoring result should change the official profile, it triggers a profile revision.

### `risk_monitoring_mitigation_progress`

Stores mitigation implementation progress observed during one monitoring period.

It references a mitigation plan from `risk_assessment_mitigations`.

Examples:

- progress status,
- progress percentage,
- realization description,
- realized output,
- actual cost,
- obstacle,
- evidence URL or attachment reference,
- temporary effectiveness,
- follow-up plan.

This table exists because one official mitigation plan can have many monitoring progress records across Q1, Q2, Q3, Q4, or monthly periods.

## Frontend Information Architecture

The UI should use user-facing work labels, not database terminology.

Recommended navigation:

- Profil Risiko
- Penilaian Risiko
- Pemantauan Risiko
- Riwayat Risiko
- Laporan

If the sidebar needs to stay compact, group these under `Risiko`.

## Frontend Workflow

### 1. Profil Risiko

This is the main operational list.

Users select:

- year,
- organization scope,
- profile view: initial profile, current profile, final year profile.

The table shows:

- risk code,
- title,
- unit,
- category,
- risk value,
- risk level,
- priority,
- latest profile revision,
- monitoring status for the selected period,
- actions.

Actions:

- view detail,
- create monitoring,
- create profile revision,
- retire risk.

Data rule:

- current profile view uses the latest approved assessment per active risk within the selected year.
- historical profile views use the assessment snapshot valid at the selected point in time.

### 2. Buat Profil Risiko

This flow creates the first formal assessment for a year or a new risk's first approved profile entry.

Entry points:

- Profil Risiko empty state,
- Profil Risiko toolbar,
- Penilaian Risiko workspace.

Wizard sections:

1. Risk identity.
2. Cause, source, controllability, impact description.
3. Existing control and score analysis.
4. Evaluation and treatment option.
5. Mitigation plan.
6. Target risk and review schedule.
7. Review and finalization.

Finalization result:

- creates or updates the stable `risks` identity,
- creates `risk_assessments` with `type = initial_profile`,
- creates `risk_assessment_mitigations`,
- sets assessment status to `approved`.

### 3. Revisi Profil Risiko

This flow changes a profile that is already official.

Entry points:

- risk detail,
- Profil Risiko row action,
- Pemantauan Risiko when monitoring recommends profile revision.

The form is mostly the same as the initial profile form, but it is prefilled from the latest approved assessment.

Required additions:

- visible before/after summary,
- change reason,
- source context, usually monitoring period or event evidence.

The screen must show a clear banner:

> Anda sedang merevisi profil risiko aktif. Data awal disalin dari profil terakhir. Perubahan akan menjadi profil resmi setelah finalisasi.

Finalization result:

- creates a new `risk_assessments` row with `type = profile_revision`,
- links `previous_assessment_id`,
- creates a new set of `risk_assessment_mitigations`,
- makes it the latest approved profile assessment for that risk and period.

### 4. Pemantauan Risiko

This is a quarterly or monthly workspace, not a full assessment wizard.

Users select:

- monitoring period, such as `2026-Q1`,
- organization scope,
- monitoring status filter.

The list shows:

- risk identity,
- latest approved profile level,
- monitoring state: not started, draft, approved, needs revision,
- trend,
- mitigation progress completeness.

Detail layout:

- left or top section: latest official risk profile summary,
- main section: monitoring result form,
- mitigation progress section,
- right or bottom section: recommendation and finalization summary.

Monitoring fields:

- condition summary,
- observed probability,
- observed impact,
- trend: up, down, stable,
- event or LED summary,
- effectiveness conclusion,
- recommendation: record only or revise profile,
- conclusion.

Mitigation progress fields:

- one progress row per official mitigation plan,
- status,
- percent,
- realization,
- obstacles,
- evidence,
- follow-up.

Finalization result:

- sets monitoring status to `approved`,
- does not change the official profile by itself.

If probability, impact, or mitigation plan should officially change, the UI shows:

> Perubahan ini memerlukan revisi profil risiko.

Primary action:

- Buat Revisi Profil

### 5. Riwayat Risiko

Risk detail should include an audit timeline.

Timeline examples:

- Profil awal 2026 approved.
- Monitoring 2026-Q1 finalized.
- Monitoring 2026-Q2 finalized, trend naik.
- Revisi Profil 2026-Q2 approved.
- Monitoring 2026-Q3 finalized.
- Risiko retired through retirement review.

The timeline should distinguish assessment events from monitoring events.

### 6. Laporan Semester

Semester report generation should not require users to create a semester assessment.

Inputs:

- year,
- semester: H1 or H2,
- organization scope.

Derived data:

- H1 = Q1 + Q2 monitoring and approved assessment revisions through Q2.
- H2 = Q3 + Q4 monitoring and approved assessment revisions through Q4.

Report output:

- risk trend from semester start to semester end,
- risks up, down, or stable,
- new risks,
- retired risks,
- profile revisions,
- mitigation completion and obstacles,
- LED summaries where available.

## UI Copy Rules

Use Indonesian operational labels:

- `Buat Profil Risiko`
- `Revisi Profil Risiko`
- `Pemantauan Risiko`
- `Finalisasi`
- `Perlu Revisi Profil`
- `Profil Aktif`
- `Profil Awal`
- `Profil Akhir Tahun`

Avoid exposing technical labels:

- `risk_assessment`
- `risk_monitoring`
- `version group`
- `is current`
- `cycle current`

## Error and Guardrail Rules

Block finalizing a profile assessment when:

- required scoring fields are invalid,
- no mitigation plan exists for a risk requiring treatment,
- a profile revision lacks a change reason,
- the selected period is older than a newer approved revision for the same risk.

Block finalizing monitoring when:

- required monitoring conclusion is missing,
- mitigation progress is required but incomplete,
- observed probability or impact is outside allowed criteria.

Warn, but do not block, when:

- observed score changes but user chooses not to revise the profile,
- all mitigation progress is poor but effectiveness is marked effective,
- a revision changes too many identity fields and may actually be a new risk.

## Migration Rules

Full history must be migrated.

Existing `risks` rows become:

- stable `risks` rows grouped by current lineage,
- `risk_assessments` rows for formal versions,
- `risk_assessment_mitigations` rows for each version's mitigation plan.

Existing monitoring-like versions become monitoring records where the source data indicates monitoring context. If a legacy row has insufficient context, preserve it as an assessment revision with an explicit migration note instead of dropping it.

Existing `risk_mitigation_tasks` data is migrated into `risk_monitoring_mitigation_progress` only when it represents progress, realization, obstacle, or execution evidence. Pure scheduling metadata should be mapped into assessment mitigation scheduling fields when it belongs to the plan.

## Reporting Rules

Active profile:

- latest approved assessment per active risk for selected year.

Initial profile:

- first approved annual assessment per risk for selected year.

Profile revision:

- approved assessment linked to a prior assessment with a change reason.

Semester trend:

- compare the latest approved assessment at semester start against latest approved assessment at semester end.
- if no approved revision exists inside the semester, use finalized monitoring observations to report operational trend while leaving official profile level unchanged.

Mitigation trend:

- aggregate `risk_monitoring_mitigation_progress` across the semester's monitoring periods.

## Non-Goals

- No approval inbox workflow in this phase.
- No electronic signature workflow in this phase.
- No full LED module in this phase, though monitoring can reference LED summaries.
- No risk criteria redesign in this phase.
- No implementation before schema impact is reviewed field by field.

## Testing Plan

Backend tests should cover:

- risk identity is stable across assessment revisions,
- initial profile finalization creates assessment and mitigation plan records,
- profile revision requires a change reason,
- monitoring finalization does not mutate the official profile,
- monitoring can trigger a profile revision flow,
- full migration preserves historical assessment order,
- mitigation progress history is not overwritten by later monitoring.

Frontend tests should cover:

- Profil Risiko shows initial, current, and final-year views,
- Buat Profil Risiko finalizes directly to approved,
- Revisi Profil Risiko is prefilled and requires a change reason,
- Pemantauan Risiko can finalize without creating a profile revision,
- monitoring with material changes exposes the Buat Revisi Profil action,
- Riwayat Risiko timeline separates profile and monitoring events,
- semester report filters map H1 to Q1/Q2 and H2 to Q3/Q4.

## Implementation Gate

Before coding, write and review a field-level schema plan that explicitly lists changes to:

- `risks`,
- existing mitigation tables,
- existing monitoring or approval-related fields,
- report query sources,
- frontend API response contracts.

The user requested prior notification for any added, removed, or changed fields on the existing `risks` table. Treat this as a hard gate.
