# Risk Assessment and Monitoring Redesign

## Context

Manris currently stores risk identity, risk assessment content, monitoring cycle state, versioning, approval status, mitigation plan, and archival behavior mostly around the existing `risks` and mitigation-related tables. That model has worked for the current flow, but it mixes several KMK concepts into one data shape.

The long-term KMK-aligned model can separate risk identity, assessment, monitoring,
mitigation plan, and mitigation progress. For the current implementation phase,
Manris will keep the existing model where `risks` stores both the risk profile and
assessment snapshot. Monitoring will be added as a `Transaksi Pemantauan` layer that explains
why a new risk version was created.

This design follows the product decision that approval workflow is out of scope for now. Finalization directly approves the record.

## Decisions

Use an incremental compatibility layer, not a full refactor.

Scope rule:

- This redesign applies only to the existing Pemantauan workflow, including the Pemantauan tab and bulk monitoring mode.
- It does not change the normal new-risk registration workflow.
- It does not change bulk import for new risks.
- It does not change direct profile/reassessment workflows except where they are explicitly linked from a monitoring transaction.

The target tables are:

- `risks`
- `risk_monitorings`
- existing `mitigations`
- existing `mitigation_tasks`

Do not add `risk_assessments`, `risk_assessment_mitigations`, or
`risk_monitoring_mitigation_progress` in this phase.

Do not remove or reshape `mitigations` or `mitigation_tasks` in this phase.

`risk_monitorings` records the `Transaksi Pemantauan`. When a monitoring is
finalized, the system creates a new `risks` row based on the observed monitoring
score and links the `Transaksi Pemantauan` to both the source risk version and the
resulting risk version.

Before implementation, Manris must present a field-by-field schema impact list to the user covering:

- fields added to `risk_monitorings` for `Transaksi Pemantauan`,
- fields kept unchanged in `risks`,
- fields used from existing `mitigations` and `mitigation_tasks`,
- API response fields that expose monitoring links to risk versions.

No schema edit should happen until that field list is reviewed. Existing `risks`
fields should not be added, removed, renamed, or moved in this phase unless the
user explicitly approves a separate schema impact list.

## KMK Timing Model

Penilaian risiko remains represented by the existing versioned `risks` rows.

Pemantauan risiko is semester-based for this phase.

The only allowed monitoring periods are:

- `YYYY-H1`
- `YYYY-H2`

Do not introduce quarterly or monthly monitoring periods in this phase.

Semester reporting uses finalized `Transaksi Pemantauan` records and their linked risk
versions for the selected semester.

## Data Model

### `risks`

Stores the current project model: risk identity, assessment/profile content,
score fields, target fields, review cycle state, and versioning metadata.

Examples:

- code,
- title,
- category,
- organization,
- objective or planning links,
- risk owner,
- control owner,
- lifecycle status such as active or retired.

For this phase, `risks` remains the source of truth for the official profile score.
Monitoring finalization creates a new `risks` version rather than mutating the
existing source version in place.

### `risk_monitorings`

Stores `Transaksi Pemantauan` results.

Examples:

- semester monitoring period,
- linked source risk version,
- linked result risk version after finalization,
- latest condition,
- event or LED summary,
- observed probability,
- observed impact,
- observed weight and nilai,
- observed level,
- trend: up, down, stable,
- effectiveness conclusion,
- finalization metadata.

Required links:

- `source_risk_id`: the approved/current risk version monitored when the user clicked `Mulai Pemantauan`.
- `result_risk_id`: nullable while draft; populated with the newly created risk version on finalization.

Source selection rule:

- `Mulai Pemantauan` uses the approved/current risk version visible to the user at click time as `source_risk_id`.
- The system does not recalculate `source_risk_id` from semester start boundaries.
- Once the `Transaksi Pemantauan` is created, `source_risk_id` is immutable.
- If the current active risk changes later, the existing transaction still monitors its original `source_risk_id`.

Baseline snapshot fields:

- `source_probability`
- `source_impact`
- `source_weight`
- `source_nilai`
- `source_level`
- `source_version_number`

Snapshot rule:

- `Mulai Pemantauan` copies baseline score and version fields from `source_risk_id` into `risk_monitorings`.
- `source_risk_id` remains the canonical link to the monitored risk version.
- Snapshot fields are used for stable before/after display and semester reporting.
- Snapshot fields should not be recomputed from the source risk after the transaction is created.
- `source_level` is a display snapshot derived from `source_nilai` when the transaction is created.
- `observed_level` is a display snapshot derived from observed nilai when the draft is saved.
- Level snapshots are not the primary input for score calculations.

Required period fields:

- `assessment_cycle`: semester key in `YYYY-H1` or `YYYY-H2` format.

Monitoring statuses:

- `draft`
- `finalized`
- `void`

Monitoring finalization always creates a new official risk version for this phase.
That new version copies profile content from `source_risk_id`, applies the observed
probability, impact, weight, and nilai from the monitoring result, and keeps the
existing risk versioning lineage.

Activation rule:

- `Finalisasi Pemantauan` directly approves and activates the resulting risk version.
- The resulting risk version has `status = approved`.
- The resulting risk version becomes the active current version for the risk lineage.
- The source risk version is no longer current after finalization.
- For the same semester, the resulting risk version becomes the cycle-current version.
- No approval queue, reviewer step, or separate activation action is used in this phase.

Stale source rule:

- `Finalisasi Pemantauan` is allowed only while `source_risk_id` is still an approved/current risk version.
- If another workflow has already activated a newer risk version in the same lineage, finalization is blocked.
- The UI should tell users that the source risk version is no longer active and they must start monitoring again from the latest active version.
- The stale draft `Transaksi Pemantauan` can be voided, but it should not be silently retargeted to the newer risk version.

Finalization mutability rule:

- `Transaksi Pemantauan` supports two finalization modes: `score_only` and `with_profile_revision`.
- Default mode is `score_only`.
- `score_only` finalization may only change scoring fields and review/version metadata on the resulting risk version.
- Allowed score changes: probability, impact, weight, nilai, and inherent score where still used.
- Allowed metadata changes: assessment cycle, review type, review/finalization timestamps, status, current flags, version lineage, and version number.
- `with_profile_revision` finalization may also carry risk substance changes from the same monitoring form into the resulting risk version.
- Substance changes include title, category, cause, risk source, controllability, impact description, existing control, treatment option, and mitigation plan.
- The UI must make `with_profile_revision` explicit before finalization.

Mitigation distinction rule:

- Changing mitigation plan fields is a profile substance change and triggers `with_profile_revision`.
- Mitigation plan fields include action, owner, due date, target cost, expected output, mitigation type, and other plan commitments.
- Reporting realization, progress percentage, obstacles, evidence, or follow-up is monitoring progress, not a profile substance change.
- Monitoring progress remains in `mitigation_tasks` details and `risk_monitorings` summary fields.

Mode detection rule:

- The system determines monitoring mode from the diff between the source risk snapshot and the current form values.
- If only scoring fields changed, mode remains `score_only`.
- If any risk substance field changed, mode becomes `with_profile_revision`.
- The mode is not selected through a manual toggle.
- Before finalization in `with_profile_revision` mode, the confirmation dialog must list the profile fields that changed.
- Users must explicitly confirm that the monitoring also revises the risk profile.

Creation rule:

- `Mulai Pemantauan` creates the `Transaksi Pemantauan` first.
- The existing monitoring/assessment form is then opened in the context of that transaction.
- The system should not create the resulting `risks` version until finalization.
- Draft form data belongs to the `Transaksi Pemantauan` while the monitoring is still in progress.
- Draft monitoring fields are stored on `risk_monitorings`, not in a draft `risks` row.

Uniqueness rule:

- Only one active draft `Transaksi Pemantauan` is allowed for the same `source_risk_id` and `assessment_cycle`.
- If a draft already exists, `Mulai Pemantauan` returns that draft and the UI should label the action as `Lanjutkan Pemantauan`.
- If a finalized transaction already exists for the same `source_risk_id` and `assessment_cycle`, users cannot start another monitoring transaction against that same source version and semester.
- Corrections after finalization must use the existing reassessment/profile revision workflow instead of reopening the finalized monitoring transaction.

### Existing `mitigations` and `mitigation_tasks`

Keep both tables unchanged.

Mitigation plans remain in `mitigations`. Mitigation execution/progress evidence
continues to use `mitigation_tasks`.

`risk_monitorings` may summarize mitigation progress for the semester, but it
does not own per-mitigation progress rows in this phase.

Mitigation progress rule:

- Per-activity mitigation progress remains in `mitigation_tasks`.
- `risk_monitorings` stores only the semester summary of mitigation progress.
- The summary can include completion percentage, realization summary, obstacles, and follow-up.
- The monitoring form may show existing mitigation tasks for context.
- Changing the mitigation plan itself is not treated as progress; it becomes a profile revision within the monitoring transaction.
- Do not create a new mitigation-progress table in this phase.

## Frontend Information Architecture

Reuse the existing frontend information architecture for this phase.

Do not introduce a new risk module IA or split the sidebar into new dedicated
sections for this phase.

The current assessment/monitoring screens should remain the primary user path.
Frontend changes should be limited to the states, labels, API payloads, and
redirects needed to support `risk_monitorings`.

Route rule:

- `Transaksi Pemantauan` uses `/risk/monitoring/[id]`, where `[id]` is `risk_monitorings.id`.
- The new route reuses the existing monitoring/assessment form UI.
- Do not overload `/risk/assessment/[id]` with `risk_monitorings.id`.
- `/risk/assessment/[id]` remains for existing risk assessment/reassessment IDs.

Use user-facing work labels, not database terminology:

- `Transaksi Pemantauan`
- `Mulai Pemantauan`
- `Pemantauan Risiko`
- `Finalisasi Pemantauan`
- `Hasil Pemantauan`
- `Versi Risiko Hasil Pemantauan`

## Frontend Workflow

### 1. Existing Risk List and Detail

Keep the existing risk list and detail experience.

Users select:

- assessment cycle or semester where the current UI already supports it,
- organization scope,
- status or monitoring filters where already available.

The table shows:

- risk code,
- title,
- unit,
- category,
- risk value,
- risk level,
- priority,
- current version status,
- monitoring status for the selected semester where available,
- actions.

Actions:

- view detail,
- start monitoring,
- continue monitoring draft,
- view finalized monitoring result,
- create reassessment where the existing flow already supports it,
- retire risk.

Monitoring action labels:

- no transaction for selected semester: `Mulai Pemantauan`.
- active draft transaction: `Lanjutkan Pemantauan`.
- finalized transaction: `Lihat Hasil Pemantauan`.
- void transaction: follow the no-transaction state unless another active draft exists.

Data rule:

- current profile view uses the latest approved/current `risks` version per active risk.
- historical profile views use the linked `risks` versions and `Transaksi Pemantauan`.

### 2. Existing Risk Creation

Keep the existing risk creation flow.

This flow is out of scope for the `Transaksi Pemantauan` creation rule. Creating a
new risk continues to use the existing `risks` creation path.

Wizard sections:

1. Risk identity.
2. Cause, source, controllability, impact description.
3. Existing control and score analysis.
4. Evaluation and treatment option.
5. Mitigation plan.
6. Target risk and review schedule.
7. Review and finalization.

Finalization result:

- creates an approved/current `risks` row using the existing risk creation flow.
- creates mitigation plans in the existing `mitigations` table when applicable.

### 3. Existing Reassessment Flow

Keep the existing reassessment form behavior, but for this phase the Pemantauan
workflow can use the same form to revise profile substance during monitoring.

The form is mostly the same as the initial profile form, but it is prefilled from
the monitored source risk version.

Required additions:

- visible before/after summary,
- change reason,
- source context, usually monitoring period or event evidence.

The screen must show a clear banner:

> Anda sedang merevisi profil risiko aktif. Data awal disalin dari profil terakhir. Perubahan akan menjadi profil resmi setelah finalisasi.

Finalization result:

- creates a new approved/current `risks` version using the existing reassessment flow.
- links `previous_risk_id` to the prior risk version.
- keeps the same `version_group_id`.
- increments `version_number`.

For Pemantauan, this behavior is represented by `Transaksi Pemantauan.mode =
with_profile_revision` instead of a separate route or workflow.

### 4. Existing Monitoring/Assessment Screen

Reuse the current monitoring/assessment screen as the semester monitoring form.

This section applies only to the existing Pemantauan tab, manual monitoring actions,
and bulk monitoring mode. It does not apply to new-risk registration.

Entry rule:

- `Mulai Pemantauan` creates or returns the active draft `Transaksi Pemantauan` for the selected risk and semester.
- `Mulai Pemantauan` and `Lanjutkan Pemantauan` open `/risk/monitoring/[id]`.
- `Mulai Pemantauan` is unavailable when the selected source risk version already has a finalized transaction for the same semester.
- The form should clearly show the monitored source risk version and semester.

Read-only result rule:

- `Lihat Hasil Pemantauan` opens `/risk/monitoring/[id]`.
- When the `Transaksi Pemantauan` is finalized, the form is read-only.
- The read-only form shows the same monitoring sections users filled during the draft phase.
- The finalized view should also expose source risk version, finalization metadata, and a link to `result_risk_id`.
- Finalized transactions do not reopen the editable monitoring form state.

Users select:

- monitoring period, such as `2026-H1`,
- organization scope,
- monitoring status filter.

The existing list or entry point should show:

- risk identity,
- latest approved/current risk level,
- monitoring state: not started, draft, finalized, void,
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
- observed weight,
- observed nilai,
- observed level,
- trend: up, down, stable,
- event or LED summary,
- effectiveness conclusion,
- recommendation or follow-up note,
- conclusion.

Mitigation progress fields:

- one progress row per official mitigation plan,
- status,
- percent,
- realization,
- obstacles,
- evidence,
- follow-up.

Mitigation summary fields on `risk_monitorings`:

- mitigation progress summary,
- mitigation completion percentage,
- mitigation obstacles,
- mitigation follow-up.

Frontend finalization result:

- creates a new approved/current `risks` version from `source_risk_id`.
- applies the observed probability, impact, weight, and nilai from the monitoring result.
- links the `Transaksi Pemantauan` to the new version through `result_risk_id`.
- sets monitoring status to `finalized`.
- makes the resulting risk version active immediately.
- redirects to the resulting risk version detail or back to the existing monitoring list with the finalized state visible.

Draft persistence rule:

- Save actions on the monitoring form update the active `Transaksi Pemantauan`.
- Save actions do not create or update a draft `risks` version.
- The source risk profile summary is read-only while the transaction is still draft.
- The resulting `risks` version is created only by `Finalisasi Pemantauan`.

If users change non-score profile substance during monitoring, the UI shows:

> Pemantauan ini juga merevisi profil risiko. Perubahan akan menjadi versi risiko aktif setelah finalisasi.

The finalization action remains `Finalisasi Pemantauan`.

Finalization confirmation rule:

- `score_only` confirmation summarizes score movement and monitoring conclusion.
- `with_profile_revision` confirmation summarizes score movement, monitoring conclusion, and changed profile fields.
- `with_profile_revision` confirmation copy must say that the resulting version will become the active risk profile.

### 5. Existing History/Detail

Reuse the existing risk history/detail surface. Add monitoring-origin context only
where the current UI already shows version history or transaction status.

Timeline examples:

- Profil awal 2026 approved.
- Monitoring 2026-H1 finalized, trend naik.
- Monitoring 2026-H1 finalized with profile revision.
- Monitoring 2026-H2 finalized.
- Risiko retired through retirement review.

The timeline should distinguish direct profile/reassessment events from monitoring
events that created a new risk version.

### 6. Existing Semester Reports

Reuse existing semester reporting screens.

Inputs:

- year,
- semester: H1 or H2,
- organization scope.

Derived data:

- H1 = finalized `Transaksi Pemantauan` records and linked risk versions for `YYYY-H1`.
- H2 = finalized `Transaksi Pemantauan` records and linked risk versions for `YYYY-H2`.

Report output:

- risk trend from semester start to semester end,
- risks up, down, or stable,
- new risks,
- retired risks,
- profile versions created by monitoring or direct reassessment,
- mitigation completion and obstacles,
- LED summaries where available.

## UI Copy Rules

Use Indonesian operational labels:

- `Buat Profil Risiko`
- `Revisi Profil Risiko`
- `Pemantauan Risiko`
- `Finalisasi`
- `Pemantauan dengan Revisi Profil`
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
- `source_risk_id` is no longer the approved/current risk version.

Block starting monitoring when:

- a finalized `Transaksi Pemantauan` already exists for the same `source_risk_id` and `assessment_cycle`.
- the selected source risk is not an approved/current risk version.

Warn, but do not block, when:

- monitoring changes score materially from the source version,
- all mitigation progress is poor but effectiveness is marked effective,
- a revision changes too many identity fields and may actually be a new risk.

Block monitoring finalization when:

- users change risk substance but the transaction mode is still `score_only`.

## Migration Rules

No full history migration is required in this phase.

Existing `risks`, `mitigations`, and `mitigation_tasks` rows stay in place.

New `risk_monitorings` rows are created only for `Transaksi Pemantauan` performed
after this feature ships.

## Reporting Rules

Active profile:

- latest approved/current `risks` version per active risk.

Initial profile:

- earliest approved `risks` version in the version group for the selected year or cycle.

Profile revision:

- approved/current `risks` version linked to a prior version through `previous_risk_id`.

Semester trend:

- compare `risk_monitorings.source_risk_id` against `risk_monitorings.result_risk_id`.
- only finalized `Transaksi Pemantauan` records are included.

Mitigation trend:

- aggregate existing `mitigation_tasks` that belong to the monitored risk version and semester.
- use the mitigation summary fields on finalized `Transaksi Pemantauan` records for report narrative.

## Non-Goals

- No approval inbox workflow in this phase.
- No electronic signature workflow in this phase.
- No full LED module in this phase, though monitoring can reference LED summaries.
- No risk criteria redesign in this phase.
- No quarterly or monthly monitoring periods in this phase.
- No split `risk_assessments` table in this phase.
- No split mitigation-progress table in this phase.
- No implementation before schema impact is reviewed field by field.

## Testing Plan

Backend tests should cover:

- new-risk creation and bulk import continue to use the existing risk creation paths.
- `Mulai Pemantauan` creates a `risk_monitorings` draft linked to `source_risk_id`.
- `Mulai Pemantauan` does not create a new `risks` version before finalization.
- `Mulai Pemantauan` returns the existing draft for duplicate `source_risk_id` and `assessment_cycle`.
- `Mulai Pemantauan` rejects a duplicate finalized transaction for the same `source_risk_id` and `assessment_cycle`.
- saving a draft updates `risk_monitorings` without creating a draft `risks` row.
- `Mulai Pemantauan` snapshots source risk score/version fields into `risk_monitorings`.
- `source_risk_id` is selected from the approved/current risk version visible at click time and stays immutable.
- saving a draft stores observed level as a display snapshot derived from observed nilai.
- mitigation task details remain in `mitigation_tasks`.
- mitigation summary fields persist on `risk_monitorings`.
- monitoring period accepts `YYYY-H1` and `YYYY-H2`.
- monitoring period rejects quarter and month keys.
- monitoring finalization creates a new `risks` version.
- monitoring finalization immediately approves and activates the resulting risk version.
- monitoring finalization links `result_risk_id` to the new version.
- monitoring finalization preserves `version_group_id` and increments `version_number`.
- source risk version is not mutated in place.
- monitoring finalization is blocked when `source_risk_id` is no longer current.
- score-only monitoring finalization only changes score and review/version metadata on the resulting risk version.
- monitoring finalization with profile revision can carry explicit substance changes from the same form.
- monitoring mode is detected automatically from score and substance diffs.
- finalization confirmation lists changed profile fields for `with_profile_revision`.
- mitigation plan changes trigger `with_profile_revision`, while mitigation progress does not.
- mitigation progress continues to come from existing `mitigation_tasks`.

Frontend tests should cover:

- new-risk registration screens remain on the existing creation workflow,
- bulk new-risk import remains separate from bulk monitoring,
- existing risk list/detail surfaces show monitoring status when available,
- monitoring actions use `/risk/monitoring/[id]` with `risk_monitorings.id`,
- existing risk creation still finalizes directly to approved,
- existing reassessment is prefilled and requires a change reason,
- Pemantauan Risiko creates a semester monitoring draft,
- monitoring finalization creates and navigates to the resulting risk version,
- finalized monitoring actions open the existing form in read-only result mode,
- Riwayat Risiko timeline separates profile and monitoring events,
- semester report filters use only H1 and H2 `Transaksi Pemantauan` records.

## Implementation Gate

Before coding, write and review a field-level schema plan that explicitly lists changes to:

- `risks`,
- existing mitigation tables,
- existing monitoring or approval-related fields,
- report query sources,
- frontend API response contracts.

The user requested prior notification for any added, removed, or changed fields on the existing `risks` table. Treat this as a hard gate.
