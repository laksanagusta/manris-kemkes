# Dashboard Narrative Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the MANRIS overview page as the approved airy Narrative Overview while preserving existing dashboard data, states, navigation, and accessibility.

**Architecture:** Keep request orchestration in the overview route and keep backend contracts unchanged. Add one tested analytics helper for the current 5×5 matrix, one shared presentational heatmap primitive, and compose the existing KPI, trend, priority-risk, and multi-phase panels into the approved reading order. Mirror the same primitives and hierarchy in the design-system catalogue and document the pattern in `DESIGN.md`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Recharts, Node test runner.

---

## File Map

- Create `frontend/src/components/dashboard-narrative-overview.test.ts`: source-contract tests for the approved page order, semantic sections, responsive layout, and catalogue synchronization.
- Modify `frontend/src/lib/dashboard-insights.ts`: derive a current-cycle 5×5 risk matrix from already-fetched risk snapshots.
- Modify `frontend/src/lib/dashboard-insights.test.ts`: cover matrix selection, cell placement, and invalid values.
- Create `frontend/src/components/shared/design-system/domain/risk-heatmap-grid.tsx`: pure accessible heatmap grid shared by compact and multi-phase views.
- Create `frontend/src/app/(app)/overview/_components/current-risk-heatmap.tsx`: compact current-cycle distribution panel.
- Modify `frontend/src/components/shared/design-system/index.ts`: export the new shared heatmap primitive.
- Modify `frontend/src/components/shared/design-system/layout/dashboard-kpi-card.tsx`: support optional evidence text and stable loading/error semantics.
- Modify `frontend/src/app/(app)/overview/_components/unit-total-risk-score-chart.tsx`: tune the existing chart for the full-width hero role.
- Modify `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`: add the approved priority framing and restrained row geometry.
- Modify `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`: reuse the shared accessible grid and present the section as advanced analysis.
- Modify `frontend/src/app/(app)/overview/page.tsx`: compose the approved Narrative Overview order and derive the current matrix.
- Modify `frontend/src/components/shared/design-system/data/overview-fixtures.ts`: add fixture evidence and heatmap data.
- Modify `frontend/src/components/shared/design-system/examples/overview-dashboard-example.tsx`: demonstrate the production hierarchy with shared primitives.
- Modify `frontend/src/app/(app)/design-system/page.tsx`: explain the canonical Narrative Overview pattern.
- Modify `DESIGN.md`: record dashboard hierarchy, surface, color, motion, and responsive rules.

### Task 1: Lock the narrative and heatmap data contracts

**Files:**
- Create: `frontend/src/components/dashboard-narrative-overview.test.ts`
- Modify: `frontend/src/lib/dashboard-insights.test.ts`
- Modify: `frontend/src/lib/dashboard-insights.ts`

- [ ] **Step 1: Write the failing narrative source-contract test**

Create `frontend/src/components/dashboard-narrative-overview.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const overviewPage = read("../app/(app)/overview/page.tsx");
const catalogue = read(
  "./shared/design-system/examples/overview-dashboard-example.tsx",
);

test("overview follows the approved narrative order", () => {
  const kpis = overviewPage.indexOf("data-dashboard-section=\"kpis\"");
  const trend = overviewPage.indexOf("data-dashboard-section=\"trend\"");
  const priorities = overviewPage.indexOf(
    "data-dashboard-section=\"priorities\"",
  );
  const phases = overviewPage.indexOf(
    "data-dashboard-section=\"multi-phase\"",
  );

  assert.ok(kpis >= 0);
  assert.ok(trend > kpis);
  assert.ok(priorities > trend);
  assert.ok(phases > priorities);
  assert.match(overviewPage, /Total Risiko/);
  assert.match(overviewPage, /Risiko Tinggi & Sangat Tinggi/);
  assert.match(overviewPage, /Penanganan Overdue/);
  assert.match(overviewPage, /Risk Exposure/);
});

test("overview and catalogue use the same dashboard primitives", () => {
  for (const component of ["DashboardKpiCard", "RiskHeatmapGrid"]) {
    assert.match(overviewPage, new RegExp(`<${component}[\\s>]`));
    assert.match(catalogue, new RegExp(`<${component}[\\s>]`));
  }
  assert.match(overviewPage, /xl:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(18rem,0\.65fr\)\]/);
});
```

- [ ] **Step 2: Add failing tests for a current-cycle heatmap matrix**

In `frontend/src/lib/dashboard-insights.test.ts`, expose the helper in the existing destructuring and add:

```ts
test("buildCurrentRiskHeatmapMatrix selects effective versions and places counts", () => {
  const result = buildCurrentRiskHeatmapMatrix(
    [
      makeDashboardRisk({
        id: "risk-a-q2",
        versionGroupId: "risk-a",
        assessmentCycle: "2026-Q2",
        probability: 2,
        impact: 3,
      }),
      makeDashboardRisk({
        id: "risk-a-q3",
        versionGroupId: "risk-a",
        assessmentCycle: "2026-Q3",
        probability: 4,
        impact: 5,
      }),
      makeDashboardRisk({
        id: "risk-b-q3",
        versionGroupId: "risk-b",
        assessmentCycle: "2026-Q3",
        probability: 4,
        impact: 5,
      }),
    ],
    "2026-Q3",
  );

  assert.equal(result[3][4], 2);
  assert.equal(result.flat().reduce((sum, count) => sum + count, 0), 2);
});

test("buildCurrentRiskHeatmapMatrix ignores invalid coordinates", () => {
  const result = buildCurrentRiskHeatmapMatrix(
    [
      makeDashboardRisk({ probability: 0, impact: 3 }),
      makeDashboardRisk({ probability: 4, impact: 6 }),
    ],
    "2026-H1",
  );

  assert.deepEqual(result, Array.from({ length: 5 }, () => Array(5).fill(0)));
});
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```bash
cd frontend
npm test -- src/components/dashboard-narrative-overview.test.ts src/lib/dashboard-insights.test.ts
```

Expected: FAIL because `buildCurrentRiskHeatmapMatrix`, section markers, and `RiskHeatmapGrid` do not exist yet.

- [ ] **Step 4: Implement the matrix helper**

Add to `frontend/src/lib/dashboard-insights.ts`:

```ts
export function buildCurrentRiskHeatmapMatrix(
  risks: RiskLike[],
  targetCycle: string,
): number[][] {
  const matrix = Array.from({ length: 5 }, () => Array<number>(5).fill(0));

  for (const risk of selectEffectiveRiskVersions(risks, targetCycle)) {
    const probability = risk.monitoringObservedProbability ?? risk.probability;
    const impact = risk.monitoringObservedImpact ?? risk.impact;
    if (
      probability === undefined ||
      impact === undefined ||
      !Number.isInteger(probability) ||
      !Number.isInteger(impact) ||
      probability < 1 ||
      probability > 5 ||
      impact < 1 ||
      impact > 5
    ) {
      continue;
    }
    matrix[probability - 1][impact - 1] += 1;
  }

  return matrix;
}
```

- [ ] **Step 5: Run the analytics test**

Run:

```bash
cd frontend
npm test -- src/lib/dashboard-insights.test.ts
```

Expected: PASS for all dashboard insight tests; the narrative source-contract test still fails.

- [ ] **Step 6: Commit the analytics contract**

```bash
git add frontend/src/lib/dashboard-insights.ts frontend/src/lib/dashboard-insights.test.ts frontend/src/components/dashboard-narrative-overview.test.ts
git commit -m "test: define narrative dashboard contracts"
```

### Task 2: Build the shared metric and heatmap primitives

**Files:**
- Create: `frontend/src/components/shared/design-system/domain/risk-heatmap-grid.tsx`
- Modify: `frontend/src/components/shared/design-system/layout/dashboard-kpi-card.tsx`
- Modify: `frontend/src/components/shared/design-system/index.ts`
- Modify: `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`

- [ ] **Step 1: Add the pure accessible heatmap grid**

Create `frontend/src/components/shared/design-system/domain/risk-heatmap-grid.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { getHeatmapCellClass, type HeatmapMode } from "@/lib/heatmap-utils";
import {
  calculateNilai,
  getBobot,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
} from "@/lib/risk";

export function RiskHeatmapGrid({
  matrix,
  label,
  mode = "riskLevel",
  className,
}: {
  matrix: number[][];
  label: string;
  mode?: HeatmapMode;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-5 gap-1", className)}>
      {[...matrix].reverse().flatMap((row, rowIndex) =>
        row.map((count, colIndex) => {
          const probability = 5 - rowIndex;
          const impact = colIndex + 1;
          const level = getRiskLevelLabel(
            getRiskLevelFromNilai(
              calculateNilai(probability, impact, getBobot(probability, impact)),
            ),
          );
          return (
            <div
              key={`${probability}-${impact}`}
              role="img"
              aria-label={`Probabilitas ${probability}, dampak ${impact}, level ${level}, ${count} risiko`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                getHeatmapCellClass(count, probability, impact, mode),
              )}
            >
              <span aria-hidden="true">{mode === "riskLevel" && count === 0 ? "" : count}</span>
            </div>
          );
        }),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Export the grid and extend the KPI primitive**

Export `RiskHeatmapGrid` from `frontend/src/components/shared/design-system/index.ts`. Change `DashboardKpiCard` to accept `detail?: string` and render the detail after the value:

```tsx
{detail ? (
  <p className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</p>
) : null}
```

Keep its `aria-busy`, error em dash, 28 px tabular value, white surface, and existing loading skeleton.

- [ ] **Step 3: Refactor multi-phase cells to the shared grid**

In `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`, replace the inline reversed matrix/cell loop with:

```tsx
<RiskHeatmapGrid
  matrix={gridData}
  label={`Heatmap ${labelMap[phase]}`}
  mode={heatmapMode}
/>
```

Remove imports that were only used by the deleted inline cell rendering. Keep the fetch, phase labels, unavailable-phase state, and severity legend unchanged.

- [ ] **Step 4: Run architecture and type-facing tests**

Run:

```bash
cd frontend
npm test -- src/components/design-system-architecture.test.ts src/components/design-system-components.test.ts
```

Expected: PASS, confirming the new domain primitive owns no API behavior and is exported through the root barrel.

- [ ] **Step 5: Commit the shared primitives**

```bash
git add frontend/src/components/shared/design-system/domain/risk-heatmap-grid.tsx frontend/src/components/shared/design-system/layout/dashboard-kpi-card.tsx frontend/src/components/shared/design-system/index.ts 'frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx'
git commit -m "feat: add narrative dashboard primitives"
```

### Task 3: Compose the production Narrative Overview

**Files:**
- Create: `frontend/src/app/(app)/overview/_components/current-risk-heatmap.tsx`
- Modify: `frontend/src/app/(app)/overview/_components/unit-total-risk-score-chart.tsx`
- Modify: `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`
- Modify: `frontend/src/app/(app)/overview/page.tsx`

- [ ] **Step 1: Create the compact current-risk heatmap panel**

Create `frontend/src/app/(app)/overview/_components/current-risk-heatmap.tsx`:

```tsx
import {
  OverviewPanelState,
  RiskHeatmapGrid,
  StandardCard,
} from "@/components/shared/design-system";

export function CurrentRiskHeatmap({
  matrix,
  loading,
  error,
  onRetry,
}: {
  matrix: number[][];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const total = matrix.flat().reduce((sum, count) => sum + count, 0);
  return (
    <StandardCard
      title="Peta Risiko Saat Ini"
      className="h-full"
      contentClassName="px-5 pb-5 pt-1"
    >
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        Distribusi probabilitas dan dampak pada kuartal berjalan.
      </p>
      {loading ? (
        <OverviewPanelState state="loading" message="Memuat peta risiko..." className="min-h-64" />
      ) : error ? (
        <OverviewPanelState state="error" message="Peta risiko tidak dapat dimuat." onRetry={onRetry} className="min-h-64" />
      ) : total === 0 ? (
        <OverviewPanelState state="empty" message="Belum ada distribusi risiko untuk kuartal ini." className="min-h-64" />
      ) : (
        <div className="mx-auto max-w-72">
          <RiskHeatmapGrid matrix={matrix} label="Peta risiko kuartal berjalan" />
          <p className="mt-4 text-xs text-muted-foreground">{total} risiko aktif terpetakan</p>
        </div>
      )}
    </StandardCard>
  );
}
```

- [ ] **Step 2: Promote the trend panel to hero geometry**

In `unit-total-risk-score-chart.tsx`, use the title `"Tren Eksposur Risiko"`, render `"Perbandingan skor aktual dan target dalam empat kuartal terakhir."` as a muted paragraph at the start of the card content, move the legend into a compact right-aligned row after that paragraph, and use `className="h-72 w-full sm:h-80 lg:h-[22rem]"` for the chart. Keep the existing tooltip, axes, screen-reader list, and all state branches.

- [ ] **Step 3: Refine the priority panel without changing navigation**

In `top-risks-panel.tsx`, change the title to `"Risiko yang Perlu Perhatian"`, render `"Prioritas berdasarkan skor risiko tertinggi."` as a muted paragraph before the state/list content, retain the existing `href={`/risk/register/${risk.id}`}`, score semantics, organization label, local states, focus ring, and five-item limit. Use `contentClassName="px-5 pb-3 pt-0"` and matching `-mx-5 px-5` row insets.

- [ ] **Step 4: Recompose the overview page**

In `frontend/src/app/(app)/overview/page.tsx`:

1. Replace `KpiCard` with `DashboardKpiCard`.
2. Import `CurrentRiskHeatmap` and `buildCurrentRiskHeatmapMatrix`.
3. Memoize the matrix from `trendRisks` and `currentCycle`.
4. Render this exact section order:

```tsx
<PageStack className="space-y-5 lg:space-y-6">
  <CollectionPageHeader
    title="Dashboard"
    subtitle={`Ringkasan portofolio risiko · ${currentCycle}`}
    showTitle
  />

  <section data-dashboard-section="kpis" aria-label="Ringkasan metrik risiko">
    <MetricGrid className="gap-3">
      {kpiCards.map((kpi) => (
        <DashboardKpiCard key={kpi.title} {...kpi} />
      ))}
    </MetricGrid>
  </section>

  <section data-dashboard-section="trend" aria-label="Tren risiko">
    <UnitTotalRiskScoreChart
      risks={trendRisks}
      currentCycle={currentCycle}
      loading={trendLoading}
      error={trendError}
      onRetry={retryDashboard}
    />
  </section>

  <section
    data-dashboard-section="priorities"
    aria-label="Prioritas dan distribusi risiko"
    className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
  >
    <TopRisksPanel
      risks={topRisks}
      loading={topRisksLoading}
      error={topRisksError}
      onRetry={retryDashboard}
    />
    <CurrentRiskHeatmap
      matrix={currentHeatmapMatrix}
      loading={trendLoading}
      error={trendError}
      onRetry={retryDashboard}
    />
  </section>

  <section data-dashboard-section="multi-phase" aria-labelledby="multi-phase-title" className="space-y-3 pt-2">
    <div>
      <h2 id="multi-phase-title" className="text-sm font-semibold text-foreground">Analisis Multi-Fase</h2>
      <p className="mt-1 text-sm text-muted-foreground">Bandingkan distribusi risiko dari skor awal hingga target.</p>
    </div>
    <MultiPhaseHeatmapCompareCard />
  </section>
</PageStack>
```

Use only factual KPI detail strings, such as `"Seluruh risiko aktif"`; do not show a percentage, delta, or trend claim without an available comparison value.

- [ ] **Step 5: Run the narrative and insight tests**

Run:

```bash
cd frontend
npm test -- src/components/dashboard-narrative-overview.test.ts src/lib/dashboard-insights.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the production composition**

```bash
git add 'frontend/src/app/(app)/overview/page.tsx' 'frontend/src/app/(app)/overview/_components/current-risk-heatmap.tsx' 'frontend/src/app/(app)/overview/_components/unit-total-risk-score-chart.tsx' 'frontend/src/app/(app)/overview/_components/top-risks-panel.tsx'
git commit -m "feat: redesign dashboard narrative overview"
```

### Task 4: Synchronize the catalogue and written design system

**Files:**
- Modify: `frontend/src/components/shared/design-system/data/overview-fixtures.ts`
- Modify: `frontend/src/components/shared/design-system/examples/overview-dashboard-example.tsx`
- Modify: `frontend/src/app/(app)/design-system/page.tsx`
- Modify: `DESIGN.md`
- Modify: `frontend/src/components/dashboard-narrative-overview.test.ts`

- [ ] **Step 1: Strengthen the synchronization test**

Add to `frontend/src/components/dashboard-narrative-overview.test.ts`:

```ts
const designSystemPage = read("../app/(app)/design-system/page.tsx");
const designDocument = read("../../../DESIGN.md");

test("narrative overview is documented in both design-system surfaces", () => {
  assert.match(designSystemPage, /Narrative Overview/);
  assert.match(designSystemPage, /condition.*change.*attention.*concentrated.*phases/is);
  assert.match(designDocument, /dashboard-narrative-overview:/);
  assert.match(designDocument, /order: "kpis > trend > priorities-current-heatmap > multi-phase"/);
});
```

- [ ] **Step 2: Run the synchronization test and verify it fails**

Run:

```bash
cd frontend
npm test -- src/components/dashboard-narrative-overview.test.ts
```

Expected: FAIL because the catalogue prose and `DESIGN.md` contract are not yet updated.

- [ ] **Step 3: Update catalogue fixtures and example**

Add factual `detail` strings to `designSystemOverviewDashboardKpis`, and add this matrix fixture in `overview-fixtures.ts`:

```ts
export const designSystemCurrentRiskMatrix = [
  [1, 2, 0, 0, 0],
  [0, 2, 3, 1, 0],
  [0, 1, 4, 2, 1],
  [0, 0, 2, 3, 2],
  [0, 0, 1, 2, 1],
] as const;
```

Recompose `OverviewDashboardExample` in the same section order and grid proportions as production. Use `DashboardKpiCard`, `OverviewTrendCard`, `OverviewTopRisksCard`, and `RiskHeatmapGrid`; use the fixture matrix via `designSystemCurrentRiskMatrix.map((row) => [...row])` to satisfy the mutable matrix prop without weakening the fixture type. Finish the example with an `Analisis Multi-Fase` section containing three labelled fixture grids—`Skor Awal`, `Aktual`, and `Target`—so the catalogue demonstrates progressive analysis without making API requests.

- [ ] **Step 4: Update catalogue prose**

In the overview section of `frontend/src/app/(app)/design-system/page.tsx`, replace the previous two-column production description with:

```tsx
<p className="max-w-3xl text-sm leading-6 text-muted-foreground">
  Narrative Overview follows one reading sequence: condition, change,
  attention, concentrated risk, then phases. KPI surfaces remain quiet,
  the four-cycle trend owns the widest visual field, priority risks sit
  beside the current heatmap, and the complete multi-phase comparison is
  progressive analysis rather than the opening focal point.
</p>
```

- [ ] **Step 5: Add the written design contract**

Append this top-level YAML block to `DESIGN.md`:

```yaml
dashboard-narrative-overview:
  scope: "overview content only; global sidebar and topbar stay unchanged"
  audience: "leadership and operational risk teams"
  order: "kpis > trend > priorities-current-heatmap > multi-phase"
  surface: "off-white page, white panels, one-pixel neutral boundary, minimal shadow"
  radius: "12px to 16px"
  color: "monochrome structure; blue for primary trend; severity colors only for risk meaning"
  motion: "one restrained page reveal; subtle row feedback; reduced-motion safe"
  responsive: "4 KPI columns on wide screens, 2 on tablet, 1 on mobile; analytical row stacks before content becomes cramped"
  data-integrity: "never render invented deltas, percentages, counts, or movement claims"
```

- [ ] **Step 6: Run synchronization and architecture tests**

Run:

```bash
cd frontend
npm test -- src/components/dashboard-narrative-overview.test.ts src/components/design-system-architecture.test.ts src/components/design-system-components.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the synchronized design system**

```bash
git add DESIGN.md 'frontend/src/app/(app)/design-system/page.tsx' frontend/src/components/shared/design-system/data/overview-fixtures.ts frontend/src/components/shared/design-system/examples/overview-dashboard-example.tsx frontend/src/components/dashboard-narrative-overview.test.ts
git commit -m "docs: sync narrative dashboard design system"
```

### Task 5: Verify the complete redesign

**Files:**
- Modify only if verification exposes a scoped defect in files listed above.

- [ ] **Step 1: Run all frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: all Node tests PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: exit code 0 with no new lint errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Inspect both routes visually**

Run the existing frontend dev server and inspect `/overview` and `/design-system` at approximately 1440 px, 900 px, and 390 px widths. Confirm:

- the four KPI values never clip;
- the trend is the dominant panel;
- the priority list and current heatmap align at wide widths and stack cleanly before becoming cramped;
- the multi-phase grids remain readable and retain their legend;
- loading, error, and empty surfaces do not shift layout;
- keyboard focus is visible on risk links and retry actions;
- reduced-motion removes the page entrance and active transforms.

- [ ] **Step 5: Review the final diff for scope and accidental overlap**

Run:

```bash
git status --short
git diff --check HEAD~3..HEAD
git diff --stat HEAD~3..HEAD
```

Expected: no whitespace errors; only the mapped dashboard, design-system, documentation, and test files changed by these commits. Pre-existing unrelated worktree changes remain untouched.

- [ ] **Step 6: Commit any verification-only fix**

If a scoped correction was necessary, stage only the exact corrected files and commit:

```bash
git commit -m "fix: polish narrative dashboard states"
```

If no correction was necessary, do not create an empty commit.
