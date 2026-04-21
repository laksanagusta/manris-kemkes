
## Task 1: HeatmapMultiPhase repository method

### Schema surprise
- No `risk_versions` table exists. Versioning lives on the `risks` table itself via `version_group_id` + `version_number` (migration 000033). Initial version = `version_number = 1`.
- `risks` table columns used: `probability`, `impact`, `target_probability`, `target_impact`, `assessment_cycle` (format `YYYY-H1` / `YYYY-H2`), `is_cycle_current`, `version_group_id`, `version_number`, `status`, `organization_id`.

### Queries used
- **Initial**: `version_number = 1` AND `version_group_id IN (SELECT DISTINCT version_group_id FROM risks WHERE assessment_cycle LIKE '<year>-%' AND status IN ('assessment_in_review','approved'))` — i.e., v1 of every risk that has any cycle in the target year.
- **Semester 1 / 2**: filter `is_cycle_current = TRUE AND assessment_cycle = '<year>-H1|H2'`.
- **Target**: `target_probability`, `target_impact` for any current-cycle risk in the year (`assessment_cycle LIKE '<year>-%'`).
- All four run in parallel via `golang.org/x/sync/errgroup`.

### Gotchas
- `org_filter` uses `uuidArrayToStrings` helper (matches existing `HeatmapData` pattern).
- Bounds-check prob/impact [1..5]; skip NULLs via `IS NOT NULL` in WHERE.
- Adding the new method to `RiskRepository` interface broke 15 test stubs — added stub `HeatmapMultiPhase` to each. A few test files don't import `"errors"`, so stubs return `nil, nil` there instead of `errors.New("not implemented")`.

## Task 2: Extract getHeatmapCellClass to Shared Utility

### ✅ COMPLETED

**Actions Taken:**
1. Created `/frontend/src/lib/heatmap-utils.ts`
   - Exported `HeatmapMode` type: `"intensity" | "riskLevel"`
   - Exported `getHeatmapCellClass()` function (byte-identical to original)
   - Imported required dependencies: `cn`, `getBobot`, `calculateNilai`, `getRiskLevelFromNilai`

2. Updated `/frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`
   - Removed local `getHeatmapCellClass()` function (lines 141-170)
   - Added import: `import { getHeatmapCellClass } from "@/lib/heatmap-utils"`
   - Removed unused imports: `getBobot`, `calculateNilai`, `getRiskLevelFromNilai`

**Verification (PASS):**
- TypeScript: `npx tsc --noEmit` → 0 errors
- Linting: `npm run lint` → 0 errors in task-related code
- Function behavior preserved: identical class strings for same inputs
- Import properly placed with other `@/lib` imports (line 67)

**Key Pattern:**
- Heatmap cell styling uses risk level (sangat_rendah → sangat_tinggi) or intensity-based classes
- Risk level mode: derives color from prob/impact bobot calculation
- Intensity mode: color scales with count (0, ≤2, ≤5, >5)

### Ready for Task 4
This utility will be consumed by `MultiPhaseHeatmapCompareCard` component (Task 4).

## Task 3: Backend wiring /dashboard/heatmap-multi
- Route registered in `protected` middleware group in main.go (JWT-protected), next to `/dashboard/heatmap`.
- Handler uses `strconv.Atoi(c.Query("year"))` with fallback `time.Now().Year()` when missing/invalid.
- Org scope extracted via `middleware.GetAccessScope(c)`; passes `AccessibleOrgIDs` only when scope not global (mirrors HeatmapData).
- Response shape: `fiber.Map{"data": <*entity.HeatmapMultiPhase>}` — JSON serializes nested `[5][5]int` matrices as arrays-of-arrays under keys `initial`, `semester1`, `semester2`, `target`.
- RiskHandler constructor signature is positional — new usecase inserted after `heatmapDataUC` to keep logical grouping; updated call site in main.go accordingly.
- LSP surfaced stale errors about test fakes missing `HeatmapMultiPhase` on other files, but `go vet ./...` passed cleanly — fakes were in fact updated in Task 1 as context claimed; LSP cache was stale.
- Extracted existing `getHeatmapCellClass` successfully.
- Re-used `HeatmapCompare` card visual styling accurately to implement the 4-phase Heatmap Compare multi-fase component.
- Used a Set to deduplicate `yearOptions` and ensure `currentYear` is always included along with the active `year` state.
- Gracefully handled potential missing response objects with nullish coalescing to `emptyHeatmap`.

## 2026-04-21 Task: T5 - Integration into risk-review-panel

✅ **COMPLETED**: MultiPhaseHeatmapCompareCard successfully integrated

**Edits made:**
1. **Line 68**: Added import `import { MultiPhaseHeatmapCompareCard } from "./multi-phase-heatmap-compare";`
   - Placed after `getHeatmapCellClass` import, before Tabs UI imports (logical ordering)
2. **Line 859**: Inserted `<MultiPhaseHeatmapCompareCard />` as sibling to existing heatmap compare card
   - Placed after closing `</Card>` of existing heatmap (line 857)
   - Before `</div>` wrapper closes (line 860)
   - Before "Perbandingan Cycle" card starts (now line 862)

**Verification:**
- `npx tsc --noEmit`: ✅ 0 errors (no TypeScript issues)
- `npm run lint`: ✅ 0 new errors (only pre-existing warnings in unrelated files)

**Key insight**: Component self-contains all data fetching—no props required, clean integration pattern.

