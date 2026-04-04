- Replaced hard-delete KRI lifecycle with archive-only behavior via `ArchiveKRIUseCase`, repository `Archive(...)`, and HTTP endpoint `POST /api/v1/kris/:id/archive`.
- Kept archived KRI rows retrievable by ID for historical traceability while excluding them from active list/dashboard/report generation flows.
- Added `include_archived` list option in usecase/repository/handler path to preserve optional access to archived definitions without changing default active behavior.
- Introduced explicit review transitions in KRI report usecases: `submitted -> accepted|revision_requested`, with `review_note` mandatory for revision requests.
- Enforced skip as terminal user action only from `pending|revision_requested`, requiring `skip_reason`; implemented as same-row state transition (no separate approval artifacts).
- Enforced KRI report action roles as: submit/skip for `unit|super_admin`, review for `reviewer|super_admin`, excluding `pimpinan` from review actions.
- Kept KRI report submission as same-row transition (`pending|revision_requested -> submitted`) and exposed overdue as computed UI/API metadata (`isOverdue`) rather than introducing persisted `status='overdue'` rows.
- Kept KRI canonical value mutation only on `submitted -> accepted` review transition; submission/resubmission does not update `KRI.CurrentValue`.
- Exposed semester summary as a dedicated read-only endpoint `GET /api/v1/risks/:id/kri-semester-summary?cycle={cycle}` that resolves risk version group from `:id` and defaults cycle to previous half-year from reassessment draft assessment cycle.
- Chose lightweight ESM `.mjs` wrappers for test-only module resolution so the frontend could keep `npm test` on pure `node:test` while preserving Next.js production build compatibility.
- Replaced KRI detail destructive delete affordance with archive-only action (`POST /kris/:id/archive`) and suppressed archive button when the KRI is already archived.
- Kept KRI current-value surfaces labeled as accepted-only canonical values and refreshed detail state via API fetch callback from report-list mutations instead of full page reload.
- Added a distinct KRI reviewer surface inside compliance monitoring workspace (`KRI Reviewer Queue` tab) instead of reusing `/inbox`, preserving separation from risk approval workflow.
- Implemented reviewer queue filters as `submitted`, `revision_requested`, and computed `overdue` attention; overdue remains a derived time-state, not a persisted report status.
- Limited reviewer actions (`accept`, `request revision`) to `submitted` items only, with mandatory non-empty reviewer note for revision requests.
- Added a read-only prior-cycle KRI summary block directly in the reassessment draft form (`risk/register/new`) instead of auto-populating risk scores, so assessors can reference accepted-value trends/governance counts while preserving manual risk judgement.
- Kept Reports page KRI export card visible but explicitly disabled with delivery-scope copy (`not part of this delivery`) to avoid accidental enablement or dead-call-to-action behavior.
- Standardized cross-surface wording to `revision requested` (instead of `revision`) in semester summary formatter outputs for consistency with reviewer queue state naming.

- 2026-04-03 Compliance verdict: reject until mandatory evidence artifacts for Tasks 6-9 are regenerated per plan and KRI report submit/review access is constrained to accessible organization scope.

- 2026-04-03 Implemented org scoping in KRI report repository `ListByUser` using requestor-organization join filter to enforce data isolation at query level.
- 2026-04-03 Implemented compensating rollback in `AcceptReportUseCase`: if KRI fetch/update fails after report accept update, report transition is reverted and error is returned.
- 2026-04-03 Removed debug logging from KRI report generation and targeted frontend compliance panels/pages to keep runtime logs clean in production paths.

- 2026-04-03 Compliance verdict: reject until mandatory evidence artifacts for Tasks 6-9 are regenerated per plan and KRI report submit/review access is constrained to accessible organization scope.
