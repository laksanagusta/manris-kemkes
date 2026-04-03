# Learnings — dashboard-enhancement

## [2026-04-04] Initial Setup

### Project Structure
- Monorepo: `backend/` (Go + Fiber) and `frontend/` (Next.js 16 + React + TypeScript)
- Frontend build command: `bun run build` (NOT npm run build)
- Backend build: `go build ./...` from `backend/` directory

### Frontend Conventions
- shadcn/ui + TailwindCSS v4
- Route groups: `(app)/` for authenticated pages
- Sub-components live in `_components/` folders alongside page files
- API calls use `api.get<T>()` pattern with `Promise.allSettled()` for parallel fetches
- Overview page is 600+ lines — heatmap is inline JSX (~lines 311-396)
- Recharts: `layout="vertical"` for horizontal bar charts; `h-64` standard chart height
- Chart colors use oklch; tooltips use dark bg with `backdrop-filter: blur(8px)`
- Every new component MUST have `data-testid` attribute

### Backend Conventions
- Clean Architecture: domain/ → repository/ → usecase/ → handler/
- `RiskHandler` struct has 12+ constructor params — add new use cases to existing struct
- Use case pattern: struct with deps + `Execute()` method
- Handler response: `c.JSON(fiber.Map{"data": result})`
- Route registration in `cmd/server/main.go`
- `dashboard_phase2.go` is a good pattern reference for analytics use cases
- SQL pattern: `COUNT(*) FILTER(WHERE ...)` for conditional aggregation

### Key Existing Helpers
- `frontend/src/lib/dashboard-insights.ts`: `weightFor()` (low=1, med=2, high=3, extreme=5) and `buildMovementSnapshotData()`
- `TopRisksUseCase` is fully implemented backend-side but NOT wired to frontend yet (endpoint exists at `/api/v1/dashboard/top-risks`)
- `HeatmapCell` type exists in `frontend/src/types/risk.ts`

### Plan-Specific Constraints
- NO new npm dependencies — Recharts handles everything
- NO filters, modals, or drill-down interactivity
- NO modifications to existing component behavior (only ADD)
- NO inline JSX in page files for new components
- All KRIs: assume "higher is worse" (actual > threshold = breach)
- Exposure Score: computed frontend-only using `weightFor()`, no new backend endpoint
- Movement snapshot on Overview: compact (counts only), NOT a chart

## [2026-04-04] Task 2: TypeScript Types

### JSON Field Naming
- Backend Go JSON tags use **camelCase** (e.g., `json:"totalRisks"`, `json:"inherentScore"`, `json:"versionGroupId"`)
- Frontend TS types match backend camelCase directly — no snake_case → camelCase transformation in the API layer
- Confirmed by: `entity.Risk` JSON tags and existing `risk.ts` types both use identical camelCase field names

### TopRisks API Shape
- `TopRisksUseCase.Execute()` returns `[]*entity.Risk` — the full Risk entity with no transformation
- Handler at `risk.go:515-532` wraps it as `fiber.Map{"data": risks}` — standard response envelope
- Created `TopRiskItem` as a focused subset interface for dashboard display (avoids requiring the full 40+ field Risk type)

### Pre-existing Backend Issues
- Go test files have pre-existing LSP errors: `GetHeatmapVelocity` method missing from test fake repos (parallel Task 1 likely adding this method)
