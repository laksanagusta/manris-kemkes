# Risk Monitoring Substance Update Design

## Context

Manris already supports approved risk baselines, monitoring drafts, assessment cycles, approval workflow, and version history through fields such as `versionGroupId`, `previousRiskId`, `isCurrent`, `assessmentCycle`, `assessment_draft`, `assessment_in_review`, and `approved`.

The current monitoring flow focuses on score reassessment: probability, impact, risk value, risk level, and related monitoring notes. The product need is to let users update risk substance during monitoring without making substance editing the main activity and without allowing direct edits to an approved baseline.

This design follows the direction of KMK HK.01.07/MENKES/1354/2024 on continuous and periodic monitoring, review of changing conditions, residual risk, mitigation monitoring, and periodic reporting. The KMK does not prescribe application-level versioning or UI mechanics; those are system controls used to preserve auditability and professional risk governance.

## Decision

Add a secondary section to the monitoring draft named **Pembaruan Substansi Risiko**.

The monitoring screen remains centered on the primary reassessment task:

- Realisasi probabilitas.
- Realisasi dampak.
- Nilai risiko and tingkat risiko.
- Catatan pemantauan.
- Efektivitas pengendalian and mitigation progress where relevant.

The new substance section is secondary and collapsed or disabled by default behind a question:

> Ada perubahan substansi risiko?

Default answer is **Tidak**. If the user chooses **Ya**, Manris opens editable fields for substance updates and requires a change reason.

Approved risks remain locked. All monitoring edits, including substance edits, happen only on a monitoring draft. After approval, the draft becomes the new current approved version and the previous approved version is archived.

## Goals

- Allow real monitoring work to capture changing conditions, causes, impacts, controls, mitigation, and ownership.
- Keep score reassessment as the main monitoring workflow.
- Avoid direct mutation of approved risk baselines.
- Preserve historical snapshots for semester reporting and audits.
- Make material changes visible before approval through summary and before/after comparison.
- Keep the workflow understandable for unit users who mainly need to update risk score and monitoring realization.

## Non-Goals

- Do not create a separate full amendment module in this phase.
- Do not let approved risks be freely edited in place.
- Do not require users to update substance during every monitoring cycle.
- Do not replace the existing risk creation and approval flow.
- Do not model every possible KMK governance role beyond the current Manris approval model.

## Workflow

### 1. Start Monitoring

The user starts monitoring from a current approved risk. Manris creates or returns an existing monitoring draft for the selected cycle.

The draft copies the latest approved risk data and links back to the baseline through `previousRiskId` and `versionGroupId`.

### 2. Primary Reassessment

The user updates monitoring fields:

- Actual probability.
- Actual impact.
- Calculated risk value.
- Risk level.
- Monitoring note or review summary.
- Residual risk interpretation if available.

This section is the main focus of the page.

### 3. Secondary Substance Update

Below the primary section, Manris shows:

> Ada perubahan substansi risiko?

If **Tidak**, no substance fields are edited.

If **Ya**, Manris opens a secondary section with editable fields:

- Risk title, for wording refinement.
- Description.
- Cause list.
- Risk source.
- Impact description.
- Existing control.
- Control effectiveness.
- Treatment option.
- Mitigation plan.
- Risk owner and control owner.

The user must fill `changeReason` and can optionally fill `reviewSummary`.

### 4. Guardrails

Manris should guide users to create a new risk instead of updating the existing one when the change is fundamental.

Examples of acceptable substance changes inside monitoring:

- A new cause is identified after an incident or audit finding.
- Existing control changes because a new SOP has been implemented.
- Mitigation actions are revised because the previous treatment was ineffective.
- Impact description is refined based on updated evidence.
- Risk owner changes due to an organizational responsibility change.

Examples that should become a new risk:

- The risk event is no longer the same event.
- The affected objective or risk object changes fundamentally.
- The owner organization changes because the risk belongs to a different process.
- The risk source and impact domain are substantially different.

### 5. Review and Approval

Before finalization, Manris shows a review screen:

- Score change summary.
- Substance change summary.
- Before/after diff for changed substance fields.
- Required change reason.
- Approval line.

On submit, the draft moves to `assessment_in_review`.

On approval, the draft becomes `approved`, current, and cycle-current. The previous approved version is archived.

## Data Rules

Use the existing versioning model:

- `versionGroupId` remains stable across versions of the same risk.
- `previousRiskId` points to the prior approved version.
- `isCurrent` marks the latest approved version.
- `isCycleCurrent` marks the current version for a cycle when needed.
- `assessmentCycle` records the monitoring period, such as `2026-H1`.
- `reviewType` should distinguish periodic and ad-hoc monitoring.
- `changeReason` is required when substance changes are enabled.
- `reviewSummary` stores the user's monitoring summary.

Add or derive a substance change indicator:

- `hasSubstanceChanges`: true when at least one substance field differs from the previous approved version.

The indicator may be computed from before/after comparison instead of stored, unless persistence is needed for filtering and reporting.

## Permissions

Recommended behavior:

- Unit users can create and edit monitoring drafts for risks within their scope.
- Approved risks are read-only for direct editing.
- Reviewers and approvers review both score and substance changes.
- Administrative corrections outside monitoring should be handled separately and audited, not mixed into this feature.

## UI Behavior

The monitoring page should visually prioritize score reassessment.

Recommended layout:

1. Header with risk identity, status, cycle, and baseline version.
2. Primary card or section: score reassessment.
3. Secondary collapsed section: Pembaruan Substansi Risiko.
4. Review panel: change summary and approval readiness.

The secondary section should use restrained copy and progressive disclosure. It should not compete with the main score update.

## Error Handling

Manris should block submission when:

- The draft is no longer editable.
- The selected cycle is older than an already approved newer cycle.
- `changeReason` is missing while substance changes are enabled.
- Required risk score fields are invalid.
- A newer in-progress reassessment already exists for the same risk and cycle.

Manris should warn, not block, when:

- The title, objective, owner, and risk source all change together, because that may indicate the user should create a new risk.
- Substance changes are large but the score does not change.
- Score changes significantly but no explanation is provided.

## Testing

Backend tests should cover:

- Monitoring draft copies approved substance fields.
- Draft score update without substance changes still works.
- Draft substance update requires `changeReason`.
- Approval activates the new version and archives the previous version.
- Previous versions remain unchanged.
- Fundamental-change warnings are produced by the comparison logic.

Frontend tests should cover:

- Substance section is collapsed or disabled by default.
- Enabling substance changes shows editable fields.
- Missing `changeReason` blocks submit when substance fields changed.
- Review screen renders score and substance before/after summaries.
- Approved risk detail remains read-only.

## Open Product Choice

For the first implementation, keep the feature scoped to monitoring drafts only. Do not add direct approved-risk edits. If administrative correction is needed later, implement it as a separate audited correction flow with strict field allowlists.
