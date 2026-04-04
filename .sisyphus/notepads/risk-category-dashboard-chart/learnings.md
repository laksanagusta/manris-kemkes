# Learnings — risk-category-dashboard-chart

## [2026-04-03] Session: ses_2abe34e65ffeZrL9wKGWlhbKaW

### Task 1 — COMPLETE (verified)

**Contract files created:**
- `backend/internal/domain/entity/dashboard.go` — added `DashboardCategoryCount` struct with `Category string` and `Count int` fields (JSON: `category`, `count`)
- `backend/internal/usecase/risk/dashboard_category.go` — implements `DashboardRiskCategoriesUseCase` with sorting: count DESC, category ASC; maps empty string → `uncategorized`
- `backend/internal/usecase/risk/dashboard_category_test.go` — two tests: sorted counts + legacy blank mapping; uses `fakeDashboardCategoryRepo` stub

**Key interfaces defined in task 1:**
- `dashboardCategoryRepo` interface in `dashboard_category.go` requires method: `DashboardCategoryCounts(ctx context.Context) ([]*entity.DashboardCategoryCount, error)`
- This interface must be satisfied by the postgres repo in task 2

**Test run (task 1 proof):**
- `go test ./internal/usecase/risk/... -run 'TestGetDashboardRiskCategoriesUseCase_...'` → PASS

### Category slugs (from risk-category-addition plan)
Six configured slugs: `strategis`, `operasional`, `kepatuhan`, `finansial`, `reputasi`, `hukum`
Legacy blank → `uncategorized` → display as `Tanpa Kategori` on frontend

### Architecture patterns
- Dashboard usecases live in `backend/internal/usecase/risk/dashboard*.go`
- Dashboard handlers are in `backend/internal/handler/http/risk.go` (around lines 483-562)
- Dashboard routes registered in `backend/cmd/server/main.go` (around line 361-366)
- Repository interface: `backend/internal/domain/repository/risk.go`
- Postgres repo: `backend/internal/repository/postgres/risk.go`

## [2026-04-03] Session: Task 2 — Backend endpoint implementation

### Task 2 — COMPLETE (verified)

**Interface change ripple effect:**
- Adding `DashboardCategoryCounts` to `RiskRepository` interface required adding stubs to **7 fake repo types** across 3 packages:
  - `usecase/risk/`: `categoryRiskRepo`, `fakeBatchRiskRepo`, `fakeCycleSnapshotRiskRepo`, `fakeReassessRiskRepo`
  - `usecase/ai/`: `fakeRiskRepository`
  - `usecase/approval/`: `fakeApprovalRiskRepo`, `fakeSubmitRiskRepo`
- Lesson: Always run `go test ./...` (not just the target package) when adding methods to a repository interface — compile-time checks `var _ repo.RiskRepository = (...)` in other packages will break.

**Handler struct ordering:**
- `dashboardCategoriesUC` field placed before `topRisksUC` in struct; constructor parameter placed after `topRisksUC` but before `mmRepo` — order in `main.go` constructor call must match.

**Handler test approach:**
- Tests live in `dashboard_category_test.go` (package `risk`) using `setupDashboardCategoryApp` helper that creates a fiber app with inline handler → avoids circular import with `handler/http`.
- Tests use `fakeDashboardCategoryRepo` (narrow interface) not the full `RiskRepository` — no stub explosion needed for these tests.

**SQL pattern:**
- `SELECT COALESCE(NULLIF(category, ''), 'uncategorized') ... WHERE deleted_at IS NULL AND is_current = TRUE GROUP BY 1 ORDER BY count DESC, category ASC`
- Same WHERE scope as `DashboardSummary` — consistent across all dashboard queries.
