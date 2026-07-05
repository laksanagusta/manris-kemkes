# Semester-Only Risk Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every business-cycle quarter with a semester and safely normalize persisted quarter data.

**Architecture:** A single semester utility contract drives backend and frontend cycle validation, ordering, date ranges, and next-cycle behavior. A transactional migration rejects ambiguous monitoring collisions, normalizes cycle columns, and installs a semester-only database constraint.

**Tech Stack:** Go 1.25, PostgreSQL migrations, Next.js 16, TypeScript, Node test runner.

---

### Task 1: Database normalization

**Files:**
- Create: `backend/db/migrations/000081_semester_only_risk_cycles.up.sql`
- Create: `backend/db/migrations/000081_semester_only_risk_cycles.down.sql`
- Create: `backend/db/migrations/000081_semester_only_risk_cycles_test.go`

- [ ] Add migration tests asserting conflict detection, `Q1/Q2 -> H1`, `Q3/Q4 -> H2`, and the final semester constraint.
- [ ] Run `go test ./db/migrations -run SemesterOnly -count=1` and confirm failure because migration 81 is absent.
- [ ] Add an up migration that drops cycle-dependent unique indexes, detects normalized active-monitoring collisions, updates all cycle-bearing tables, recreates indexes, and adds the semester constraint.
- [ ] Add a down migration that restores the quarter-compatible constraint without inventing lost quarter values.
- [ ] Re-run the focused migration test and confirm it passes.

### Task 2: Backend semester utilities

**Files:**
- Modify: `backend/internal/usecase/risk/cycle_test.go`
- Modify: `backend/internal/usecase/risk/cycle.go`
- Modify: `backend/internal/usecase/mitigation_task/approval_sync_test.go`
- Modify: `backend/internal/usecase/mitigation_task/usecases.go`
- Modify: `backend/internal/usecase/mitigation_task/approval_sync.go`

- [ ] Change tests to require semester-only validation, semester ordering, next semester, and semester date boundaries.
- [ ] Run focused tests and confirm failures caused by quarter behavior.
- [ ] Replace quarter parsers and date helpers with semester equivalents.
- [ ] Remove semester-quarter conversion helpers.
- [ ] Run focused tests and confirm they pass.

### Task 3: Backend workflows and working papers

**Files:**
- Modify: `backend/internal/domain/errors/errors.go`
- Modify: `backend/internal/usecase/risk/monitoring_transaction.go`
- Modify: `backend/internal/usecase/risk/create_monitoring_batch.go`
- Modify: `backend/internal/usecase/risk/bulk_monitoring.go`
- Modify: `backend/internal/handler/http/risk.go`
- Modify: approval, update, cascade, and mitigation-task call sites
- Modify: `backend/internal/repository/postgres/working_paper.go`
- Modify: `backend/internal/repository/postgres/working_paper_roster.go`
- Modify: affected Go tests

- [ ] Update workflow tests from quarter fixtures to semester fixtures and assert finalization remains in the same semester while task generation advances one semester.
- [ ] Run affected package tests and confirm failures.
- [ ] Make all validation semester-only, rename back-quarter behavior to back-period behavior, and generate tasks from risk/current semester.
- [ ] Query monitoring records using the working-paper semester directly.
- [ ] Run `go test ./internal/...` and fix all regressions.

### Task 4: Frontend semester selectors and compatibility removal

**Files:**
- Modify: `frontend/src/lib/risk-cycle-options.test.ts`
- Modify: `frontend/src/lib/risk-cycle-options.ts`
- Modify: risk register and bulk monitoring pages
- Modify: report normalization tests and helpers where quarter compatibility remains

- [ ] Change selector tests so monitoring uses `H1/H2`.
- [ ] Run the focused frontend test and confirm failure.
- [ ] Reuse assessment-cycle helpers for monitoring and remove quarter conversion.
- [ ] Replace quarter-shaped test fixtures that represent business cycles.
- [ ] Run frontend tests and lint.

### Task 5: Full verification

**Files:**
- Modify only files required by failures.

- [ ] Search production code for remaining business uses of `Q1-Q4`, `quarter`, and semester-quarter conversion.
- [ ] Run `go test ./...` from `backend`.
- [ ] Run `npm run test`, `npm run lint`, and `npm run build` from `frontend`.
- [ ] Review the final diff for unintended changes and verify the migration is non-destructive.
