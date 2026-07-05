# Semester-Only Risk Cycle Design

## Goal

Use `YYYY-H1` and `YYYY-H2` as the only cycle format for risk assessment,
mitigation tasks, monitoring transactions, working papers, filters, reports, and
exports.

## Cycle Contract

- `H1` covers 1 January through 30 June.
- `H2` covers 1 July through 31 December.
- New values must match `^[0-9]{4}-H[12]$`.
- The next cycle after `YYYY-H1` is `YYYY-H2`; the next cycle after `YYYY-H2`
  is `(YYYY+1)-H1`.
- Mitigation task period start and due date use the first and last day of the
  selected semester.

## Data Migration

Normalize persisted cycle values as follows:

- `Q1` and `Q2` become `H1`.
- `Q3` and `Q4` become `H2`.

The migration runs in one transaction. Before changing rows, it checks whether
normalization would create more than one active (`draft` or `finalized`)
monitoring for the same `version_group_id` and semester. If a conflict exists,
the migration aborts with an actionable error. It never deletes, voids, merges,
or silently selects a monitoring record.

The migration normalizes cycle-bearing tables, then replaces the monitoring
cycle check constraint with a semester-only constraint. A down migration
restores the previous constraint but does not attempt to reconstruct quarters,
because that information is not recoverable after normalization.

## Application Changes

- Backend cycle parsing, ordering, and validation accept semesters only.
- Monitoring creation, batch import, templates, finalization, and back-period
  protection operate on semesters.
- Finalizing monitoring creates the resulting risk in the same semester and
  prepares mitigation tasks for the next semester.
- Mitigation task generation derives period start and due date from the
  semester.
- Working-paper roster and monitoring lookup use the working-paper semester
  directly.
- Frontend monitoring selectors use the same semester helpers as assessment
  selectors.
- Compatibility conversion helpers for historical quarter-shaped API data are
  removed after the database migration becomes authoritative.

## Verification

- Migration tests verify normalization, the semester constraint, and fail-fast
  conflict detection.
- Go unit tests cover semester validation, ordering, monitoring finalization,
  mitigation dates, batch monitoring, and working-paper queries.
- Frontend tests cover current and selectable monitoring semesters.
- Repository-wide searches verify that no business-cycle quarter mapping
  remains. Spreadsheet cell references such as `Q1` are not cycle values and
  remain unchanged.
- Backend tests, frontend tests, lint, and production build must pass.
