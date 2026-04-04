- Added KRI direction normalization to `higher_worse` / `lower_worse` in domain validation and status/breach logic, replacing legacy `increasing` / `decreasing` assumptions.
- Explicit amber thresholds are now modeled as directional fields (`amber_threshold_min` or `amber_threshold_max`), with validation enforcing required bound per direction.
- Active KRI filtering is now applied by default in KRI list/dashboard queries and in report generation source selection (`GetAllKRIs`).
- KRI report state machine now persists only `pending`, `submitted`, `accepted`, `revision_requested`, and `skipped`; legacy `overdue` rows are migrated to `pending` and overdue is treated as computed state.
- Submit flow now allows `pending|revision_requested -> submitted` with optional `evidence_url` validation (HTTP/HTTPS only), while review metadata is reset on resubmission.
- Reviewer queue support is exposed via repository-level `ListReviewQueue(...)` and handler endpoint wiring with role-gated access.
- KRI report overdue is now exposed as computed metadata (`isOverdue`) from due-date plus non-terminal states (`pending`, `revision_requested`) instead of persisted `overdue` status rows.
- KRI report generation now guards on period-open timing (`harian` any day, `mingguan` Monday, `bulanan` day-1) and remains idempotent by existence check plus DB `ON CONFLICT DO NOTHING`.
- Added read-model semester summary aggregation from `kri_reports` keyed by `risk.version_group_id + assessment_cycle`, with accepted-only value/trend calculation and computed overdue governance counts.
- For frontend `node:test`, `.mjs` shims around `.ts` modules kept both Next.js build and Node test resolution happy without changing the app's runtime imports.
- Type-only imports in shared TS modules should avoid `.ts` suffixes; using extensionless or `.mjs` specifiers prevents Next TypeScript build errors.
- KRI detail report-list now supports submit/resubmit payload shape `{ value, notes, evidenceUrl }` plus skip payload `{ skipReason }`, and updates row state locally from API responses without `window.location.reload()`.
- Overdue is now rendered as an additional visual badge via `isReportOverdue(dueDate, status)` while canonical status badges remain `pending/submitted/accepted/revision_requested/skipped`.
- KRI detail and monitor pages now consume `getKRIStatus(...)` with explicit amber thresholds to keep warning semantics aligned with shared helper logic.
- KRI reviewer queue can be implemented as a dedicated compliance tab by aggregating two backend queue calls (`status=submitted` and `status=revision_requested`) and deriving `overdue` attention state client-side.
- Shared helper mapping (`filterKRIReviewQueueByState`) keeps reviewer queue filters deterministic and easy to test with Node `node:test`.
- Reviewer revision-note validation is safest as shared helper logic (`validateKRIRevisionReviewNote`) so UI validation and tests stay aligned.
- Reassessment form can consume prior-cycle KRI governance context by deriving `previousAssessmentCycle` from draft `assessmentCycle` and calling `GET /risks/:id/kri-semester-summary?cycle=...` only when `riskId` exists.
- `formatSemesterSummary(...)` from `lib/kri-reporting` is reusable for reassessment read-only cards; combine it with per-item `trendBasis` and `lastAcceptedReport` metadata to expose accepted-value context without introducing editable controls.
- Reports export cards should avoid dead CTA behavior by explicitly disabling non-delivered options (`disabled` button state + muted styling + explanatory copy) instead of relying on click-time toast guards.
- Terminology consistency across KRI surfaces is stable when user-facing labels use `submitted`, `accepted`, `revision requested`, `skipped`, and `overdue` only as a computed badge/time-state.
- Code-quality review checklists for this workflow should explicitly include residual debug logging scans in both Go (`fmt.Printf`) and frontend (`console.error`) because these surfaced in delivery files.
- Repository methods named for scoped access (example: `ListByUser`) should be validated against actual query predicates to avoid accidental broad data exposure behind role-gated endpoints.

- 2026-04-03 For plan audits, verify both implementation and evidence filenames. Passing tests/builds are insufficient when the plan requires scenario-specific Playwright/manual artifacts.

- 2026-04-03 `ListByUser` access in KRI reports must be org-scoped by query predicate (join `users` as requestor + `k.organization_id = requestor.organization_id`), not only role-gated at handler level.
- 2026-04-03 Accept transition needs compensating rollback when `KRI.CurrentValue` write fails after report status update; otherwise accepted status can persist with stale canonical KRI value.
- 2026-04-03 Debug-log cleanup for release checks should include both backend generation paths (`fmt.Printf`) and frontend catch paths (`console.error`) in compliance surfaces.

- 2026-04-03 Real manual QA via Playwright is reliable when setup seeds KRI/report data through API first (create KRI + trigger report generation), then validates UI behavior with role-specific sessions (unit submitter, reviewer validator).
- 2026-04-03 For "no page reload" verification, setting a `window` marker before submit and asserting it persists after mutation is an effective SPA-level proof alongside in-place state badge updates.

- 2026-04-03 For plan audits, verify both implementation and evidence filenames. Passing tests/builds are insufficient when the plan requires scenario-specific Playwright/manual artifacts.
