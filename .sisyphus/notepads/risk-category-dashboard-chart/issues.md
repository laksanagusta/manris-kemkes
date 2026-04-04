# Issues & Gotchas — risk-category-dashboard-chart

## [2026-04-03] Known Patterns

- Task 1 already created `DashboardRiskCategoriesUseCase` in its own file `dashboard_category.go` — task 2 must NOT re-create it, only wire the repo/handler/route layers
- The `dashboardCategoryRepo` interface is defined locally in `dashboard_category.go` — the postgres repo must implement `DashboardCategoryCounts(ctx context.Context) ([]*entity.DashboardCategoryCount, error)` exactly
- The main RiskRepository interface in `backend/internal/domain/repository/risk.go` must also get this method for the handler to inject it
- SQL collapse pattern: `COALESCE(NULLIF(category, ''), 'uncategorized')` — mirrors what the usecase does for in-memory results
- Frontend dashboard overview page uses `Promise.all` pattern for parallel fetches — category fetch must be added to the same array, with its own error state

## [2026-04-04] Scope audit findings

- `backend/cmd/server/main.go` includes unrelated wiring beyond the allowed dashboard route: organization CRUD usecases/routes, KRI archive wiring, and KRI report review actions/routes. These are out-of-scope for `risk-category-dashboard-chart` and should be reverted from the plan branch.
- `frontend/src/app/(app)/overview/page.tsx` includes forbidden unrelated UI churn beyond fetching/rendering the new category chart: removal of existing unit exposure / movement snapshot sections, heatmap/trend layout reshuffle, and new CTA links to `/compliance/monitoring` and `/reports`.
- No migration files, reports-page files, monitoring-page files, or npm package manifests changed in commit range `fa27273^..504395b`.
