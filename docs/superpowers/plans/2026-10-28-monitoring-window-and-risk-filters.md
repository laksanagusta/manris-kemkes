# Monitoring window and generic risk filters

User-directed implementation in primary checkout, existing branch, no worktree.

Design: Lihat semua monitoring opens /risk/register with assessment_cycle (last completed quarter) and monitoring_status=not_monitored. Add generic Semua pemantauan / Sudah dipantau / Belum dipantau in existing risk table toolbar. Finalized non-superseded monitoring is monitored; drafts/missing are not monitored. Scope/count/search/pagination remain native. For monitoring-status filtering, the selected period represents the monitoring cycle across active risk families, including finalized families whose resulting profile is in the following quarter.

Calendar: Asia/Jakarta, one month only starting the first day of the next quarter. Q1 April, Q2 July, Q3 October, Q4 next January. Start/resume/update/finalize/delete are rejected outside this window; reads/exports remain available. User explicitly confirmed: a missed/locked earlier quarter must not block the next quarter. Remove the sequential completion prerequisite; no reopening/backfill. No admin override or late-report mode. This changes monitoring reporting only, not treatment task deadlines.

- [x] Add deterministic boundary tests and policy; enforce in all monitoring usecases, including agent paths through those usecases.
- [x] Align operator queue and remove stale actionable drafts outside the window.
- [x] Add generic risk-table monitoring filter through native URL/query/backend count and data queries.
- [x] Route monitoring To-Do to risk register; remove special native monitoring needs_monitoring control/branch introduced earlier.
- [x] Update frontend calendar helpers, starting controls and read-only locked monitoring detail with clear window text.
- [x] Update design system/catalog and docs. Test backend/frontend/SQL, build, review and restart local backend.

## Verification outcome

Implemented on codex/operator-risk-flow-local in the primary checkout. No new worktree, dependencies, schema migration, merge or push.

- Backend: entity, risk-usecase, operator-work, HTTP, PostgreSQL repository and agenttools package tests all passed.
- Boundary coverage: exclusive Jakarta month end, first-day midnight, Q4/year rollover, all monitoring mutations outside the window, closed drafts removed from actionable work, and correct month-end To-Do deadline.
- User explicitly selected allowing subsequent quarters despite a missed locked quarter; start and queue no longer impose previous-quarter completion.
- Read-only PostgreSQL integration verified actual generic filter SQL, organization scope, row completion state, counts and pagination. For Final profiles, all selected-period rows equal monitored plus not_monitored. Final families promoted into next-quarter profiles remain visible. Draft risk period filtering stays exact.
- Frontend: 28 focused tests passed, covering calendar boundaries, generic filter URLs, quarter options, preserved return filters, legacy table policies and treatment query behavior.
- Final production webpack build passed, log /tmp/manris-quarter-window-release.log. Earlier compilation caught a removed special-filter export in the catalogue; the catalogue now uses generic risk options and the final build is clean.
- Targeted lint passed for risk list, monitoring detail, shared calendar/query helpers, catalogue and normal transaction workspace. The pre-existing unused ongoingAssessmentId warning remains in the large risk input/detail file; no new lint errors.
- Independent review found two issues (period all/status population mismatch and removed stale-response guards). Both were repaired, then re-reviewed with no remaining P1/P2. Additional risk-detail audit ensures a locked older draft does not hide the open next-quarter start action.
- The risk table loader rejects outdated responses; native transaction list response guards and loading-aware pagination remain intact.
- Local backend was restarted with the new policy. Browser access remains disabled in Work settings, so no visual or live submission verification is claimed.
- DESIGN.md, the design revision and /design-system production examples are synchronized.
