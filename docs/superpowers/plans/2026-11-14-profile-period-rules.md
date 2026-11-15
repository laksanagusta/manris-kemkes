# Period rules implementation plan

Goal: configurable monthly/quarterly/semester schedules selected by annual risk profile, enforced once per process/period, with truthful progress.

Approved design: superadmin manages named rules for a profile year; each rule has 12/4/2 nonoverlapping inclusive Jakarta date windows, including next-year windows. Profile year stays and pickup is unchanged. Selected rule is immutable once used. Existing unconfigured data retains legacy behavior rather than fabricated associations. Monitoring is once per risk family/profile period; working paper/evaluation once per profile period. Draft saves reuse record; final is immutable. API and DB enforce duplicates and dates. State is pending/ongoing/done; percent measures required signers, required evaluation items, mandatory monitoring sections; 100% draft remains ongoing.

Tasks:
1. Backend domain rule validation with failing table tests: count, order, overlaps, invalid dates, year, boundary times. Migration and API schema; superadmin-only writes and authenticated reads.
2. Profile rule selection and period progress API; repository transaction guards for all entry points and immutable rule association. Tests for races, wrong year/org, pre/post-window, historical data.
3. Frontend rules settings, rule selection keeping year/pickup, typed API and stale-response handling.
4. Shared accessible status/progress component and catalog/DESIGN.md first, dynamic profile document columns and member monitoring columns.
5. Integration, targeted/full tests, typecheck/lint/build as appropriate; review spec compliance and code quality and fix issues.

Work on current dirty workspace without reverting existing changes; do not commit unrelated work. Do not apply migrations to real data until reviewed; test using isolated DB/schema when available.

Implementation and review completed. Results and limitations: docs/specs/2026-11-14-profile-period-rules-verification.md. No commit/deployment or main application database migration performed.
