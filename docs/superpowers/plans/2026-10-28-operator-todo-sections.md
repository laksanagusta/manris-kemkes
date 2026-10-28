# Operator To-Do Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Show three independently collapsible work sections with five previews, accurate counts, direct actions and equivalent paginated filtered tables.

**Architecture:** Keep existing candidate projection and eligibility in the backend. Add an additive grouped response and section pagination to the same scoped endpoint. Reuse the same predicate for previews and full tables. A shared frontend workspace handles requests and navigation; presentational lists/sections/table live in the design system. Entity pages render the filtered workspace only when their matching workSection URL context is present; removing it restores the normal table.

**Tech Stack:** Go/Fiber/PostgreSQL, React/Next.js, existing design-system disclosure and table primitives. No dependency or schema changes.

**Workspace:** /Users/dikalaksana/Engineering/manris-v2 on codex/operator-risk-flow-local. User explicitly requested no worktree and inline implementation.

---

### Task 1: Scoped grouping and deadline policy
Files: backend/internal/domain/entity/operator_work.go, backend/internal/usecase/operator_work/{service.go,sections.go,sections_test.go}, backend/internal/repository/postgres/operator_work.go, backend/internal/handler/http/operator_work{,_test}.go.
- [x] Add failing tests: +7 included, +8 excluded, overdue retained, Jakarta midnight, period-blocked report excluded; independent preview counts; section pagination and invalid section.
- [x] Run: go test ./internal/usecase/operator_work ./internal/handler/http -count=1. Confirm new assertions fail.
- [x] Implement the seven-calendar-day cap after existing report eligibility, deterministic ID tiebreaker, and mitigationAction from m.action in every SQL UNION projection.
- [x] Add Section {key,total,items}, Summary {sections}, optional Total on paged result. Group all eligible items before truncating each preview to five. Keys: reports, monitoring, drafts.
- [x] Preserve legacy GET /work-items. Support view=sections and section=reports|monitoring|drafts; reject invalid combinations. Validate role/org before reading.
- [x] Run the same tests and inspect repository SQL against the real local database using read-only verification.

### Task 2: Frontend navigation and shared presentation
Files: frontend/src/{types/operator-work.ts,lib/api/operator-work.ts,lib/operator-work.ts,lib/operator-work.test.ts}, frontend/src/components/operator-work/{workspace.tsx,use-operator-work-actions.ts}, frontend/src/components/shared/design-system/domain/operator-work-{list,sections,table}.tsx.
- [x] Write tests for calendar-day labels, exact section routes, wrong section rejection and per-account UI state validation; run node --test src/lib/operator-work.test.ts and confirm feature is absent.
- [x] Add additive types and API calls; keep old listOperatorWork for existing callers.
- [x] Shared action hook opens exact risk/task/monitoring ID and captures /work UI state before navigation.
- [x] Workspace fetches summary or a paginated section, cancels stale responses after cleanup, preserves successful content during refresh, handles retry and role limits.
- [x] Sections use shared Collapsible independently, display truthful totals and at most five rows; zero totals have no empty panel. Show Lihat semua only above five.
- [x] Full table uses shared table/pagination, labels active section filter, offers Hapus filter and Kembali ke pekerjaan. Each row retains one domain action.
- [x] Persist disclosure booleans and scroll position under account-specific sessionStorage key; never store domain records. Restore on navigation back after content exists.

### Task 3: Route integration and design-system sync
Files: frontend/src/app/(app)/work/page.tsx, compliance/{penanganan,monitoring}/page.tsx, risk/register/page.tsx; DESIGN.md; shared/design-system/{index.ts,examples/operator-work-example.tsx}.
- [x] Update DESIGN.md before feature composition: three sections, preview limit five, deadline +7, direct actions, accessibility and reduced-motion.
- [x] /work renders shared workspace. For entity routes, workSection=matching key renders filtered full table; no key or mismatched key renders existing normal feature. Preserve direct taskId dialog behavior.
- [x] Mirror real production section components and representative empty/report/monitoring/draft samples in /design-system. Remove obsolete single-list wording.
- [x] Run frontend policy tests and targeted ESLint.

### Task 4: Verify, review, and commit
- [x] Run focused backend and frontend tests, production webpack build, git diff --check.
- [x] Restart local backend from new source and verify existing user's /work; verify disclosure behavior, direct task handoff, return restoration, filtered full table, Hapus filter, and narrow viewport.
- [x] Inspect diff against every acceptance criterion. Repair failures and rerun affected checks.
- [x] Record actual verification results in this plan, commit explicit changed files, leave current branch active. Do not migrate unrelated schema, push, merge or create a worktree.

## Verification outcome — 28 October 2026

Implemented inline on codex/operator-risk-flow-local in the primary checkout. No new worktree, dependency, schema migration, merge or push.

- Backend: go test ./internal/usecase/operator_work ./internal/handler/http ./internal/repository/postgres -count=1 passed.
- Optional database smoke test: TestOperatorWorkReadIntegration passed against the local database with default_transaction_read_only=on. This verifies all SQL UNION projections and scans without inserting fixtures or changing user data.
- Frontend: 14 policy/navigation/reporting/risk-query tests passed. Node reports the existing module-type warning; no test failures.
- Targeted ESLint passed with no errors or warnings.
- Production npm run build -- --webpack completed with exit 0; final log /tmp/manris-todo-build-verified.log.
- git diff --check passed.
- Browser on the actual operator account: three sections loaded, accurate draft count 6 with five preview rows; Lihat semua showed all six drafts; Hapus filter restored the normal risk register; Lengkapi opened exact draft R-243 and its return link restored /work.
- Keyboard Enter toggled disclosure, and collapsed state persisted after reload.
- At 390px width, page content width stayed 390px. Returning from the filtered table restored the measured scrollY=281. Viewport override was reset.
- /design-system showed production report, monitoring, draft, empty and overflow examples, including late/today/future deadline labels. The report full-list filter correctly showed no matching work for the actual account.
- The actual account has zero eligible reporting and monitoring tasks right now, so no report was submitted and no monitoring transaction was started/finalized during this verification. Those eligibility/count/navigation policies were covered by backend/frontend tests and review.
- Independent read-only review found one stale monitoring-response navigation issue. It was repaired with an origin/session generation guard, tested with an abandoned promise, then re-reviewed with no remaining P1/P2 findings.
- DESIGN.md's earlier flat-list rule was replaced and the production catalog synchronized.

This verification is scoped to the changed feature; it does not claim the pre-existing full-project test failures have been repaired. Previously pending unrelated lifecycle evidence migrations remain untouched.
