# Native filters for operator work

Scope: use existing entity table pages for every Lihat semua link. No replacement table or workSection URL.

- [x] Reports: add native needs_reporting option to status control/query, implement server predicate before COUNT and pagination. Include pending/overdue on active current final risks, eligible periods and due through Jakarta today +7. Keep normal entity access scope. Sort closest deadlines first.
- [x] Monitoring: add native needs_monitoring option. Reuse scoped backend work eligibility for draft and not-started candidates; render those in the existing monitoring table, with original draft rows/metadata when available. Missing observations/progress show a dash. Start action calls existing endpoint only on explicit click.
- [x] Add failing regression tests for new route/query values, monitoring candidate rows and report deadline SQL. Run red then green.
- [x] Keep normal filters working, search/cycle pagination before slicing, stale request guard, keyboard and return actions. Sync DESIGN.md and production catalogue.
- [x] Run focused tests, ESLint, production build, review diff and commit on codex/operator-risk-flow-local in primary checkout.

## Verification and review

- Primary checkout /Users/dikalaksana/Engineering/manris-v2, branch codex/operator-risk-flow-local. No new worktree, migration, dependency, merge or push.
- 21 focused frontend tests passed: native route/filter round-trips, monitoring start/draft composition, missing values, role-specific options, safe return navigation and delayed page clamping.
- Backend repository, HTTP and operator-work packages passed.
- Read-only PostgreSQL integration passed 11 deadline/status/risk-state cases plus real scoped count/search/period/pagination queries and the existing operator work projection. No application data was inserted/updated.
- Targeted ESLint and git diff --check passed.
- Final production webpack build completed with exit 0, log /tmp/manris-native-filters-complete-build.log. An earlier build caught missing placeholder props in the catalogue examples; those were fixed and the final build passed.
- Independent review found native monitoring starts returned to /work. Fixed by preserving the full origin URL and validating same-application return destinations. Re-review confirmed resolution and no new P1/P2 defects.
- Also fixed pre-existing eager pagination clamping so a return URL with page >1 survives initial loading; regression test passed.
- Backend was restarted from current source so native reporting filter is available locally.
- Browser verification was unavailable: local browser use is disabled in Work settings. No claim of visual or end-to-end submission testing for this revision.
- DESIGN.md, the approved design revision and production catalogue examples now document/demonstrate the new native filter choices. Treatment tables retain normal authorized entity scope, which can include other assigned tasks beyond the personalized To-Do preview. Monitoring work filter uses the operator's own scoped eligibility and is offered to unit users.
