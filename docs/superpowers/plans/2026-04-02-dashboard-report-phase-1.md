# Dashboard Report Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the weak report pie chart with unit exposure ranking, add a risk movement chart to reports, and upgrade overview trend and top-risk signals for executive users.

**Architecture:** Keep Phase 1 frontend-first and reuse existing endpoints instead of introducing new backend aggregation. Add one focused transformation helper in `frontend/src/lib/` so `reports/page.tsx` and `overview/page.tsx` share the same exposure, movement, and badge logic. Use the existing `/risks` and `/risks/compare` endpoints, and keep all UI changes inside the current page files to avoid premature refactors.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Recharts, Node `node:test`, ESLint

---

### Task 1: Add Shared Dashboard Insight Transforms

**Files:**
- Create: `frontend/src/lib/dashboard-insights.ts`
- Create: `frontend/src/lib/dashboard-insights.test.ts`
- Reference: `frontend/src/lib/risk-report-trend.ts`
- Reference: `frontend/src/types/risk.ts`

- [ ] **Step 1: Write the failing test for exposure, movement, and badge transforms**

Create `frontend/src/lib/dashboard-insights.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutiveTrendData,
  buildMovementChartData,
  buildTopRiskBadgeMap,
  buildUnitExposureData,
} from "./dashboard-insights";

test("buildUnitExposureData ranks units by weighted exposure score", () => {
  const result = buildUnitExposureData([
    { orgName: "Direktorat A", probability: 5, impact: 4 },
    { orgName: "Direktorat A", probability: 4, impact: 3 },
    { orgName: "Direktorat B", probability: 2, impact: 3 },
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 8, low: 0, medium: 0, high: 1, extreme: 1 },
    { orgName: "Direktorat B", exposureScore: 2, low: 0, medium: 1, high: 0, extreme: 0 },
  ]);
});

test("buildMovementChartData summarizes up down and stable comparison counts", () => {
  const result = buildMovementChartData([
    { code: "R-001", movement: "up" },
    { code: "R-002", movement: "up" },
    { code: "R-003", movement: "down" },
    { code: "R-004", movement: "stable" },
  ]);

  assert.deepEqual(result, [
    { label: "Naik", value: 2, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: 1, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: 1, fill: "oklch(0.60 0.02 265 / 55%)" },
  ]);
});

test("buildExecutiveTrendData keeps only high and extreme counts plus weighted exposure", () => {
  const result = buildExecutiveTrendData([
    { assessmentCycle: "2025-H2", probability: 3, impact: 4 },
    { assessmentCycle: "2025-H2", probability: 5, impact: 4 },
    { assessmentCycle: "2026-H1", probability: 2, impact: 2 },
    { assessmentCycle: "2026-H1", probability: 5, impact: 4 },
  ]);

  assert.deepEqual(result, [
    { period: "2025-H2", high: 1, extreme: 1, exposureScore: 8 },
    { period: "2026-H1", high: 0, extreme: 1, exposureScore: 6 },
  ]);
});

test("buildTopRiskBadgeMap marks movement overdue and newly introduced cycle risks", () => {
  const result = buildTopRiskBadgeMap({
    topRisks: [{ code: "R-001" }, { code: "R-002" }, { code: "R-003" }],
    allRisks: [
      { code: "R-001", nextReviewDate: "2026-03-01", assessmentCycle: "2026-H1" },
      { code: "R-002", nextReviewDate: "2026-12-01", assessmentCycle: "2026-H1" },
      { code: "R-003", nextReviewDate: "2026-12-01", assessmentCycle: "2026-H1" },
    ],
    comparisons: [
      { code: "R-001", movement: "up" },
      { code: "R-002", movement: "stable" },
    ],
    currentCycle: "2026-H1",
    now: new Date("2026-04-02T00:00:00.000Z"),
  });

  assert.deepEqual(result, {
    "R-001": ["Naik level", "Overdue"],
    "R-002": [],
    "R-003": ["Baru"],
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the helper does not exist yet**

Run:

```bash
node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: FAIL with a module-not-found error for `./dashboard-insights`.

- [ ] **Step 3: Write the minimal shared helper implementation**

Create `frontend/src/lib/dashboard-insights.ts` with:

```ts
type Severity = "Rendah" | "Sedang" | "Tinggi" | "Ekstrem";

type RiskLike = {
  code?: string;
  orgName?: string;
  assessmentCycle?: string;
  nextReviewDate?: string | null;
  createdAt?: string;
  probability?: number;
  impact?: number;
};

type ComparisonLike = {
  code?: string;
  movement?: string;
};

export type UnitExposureDatum = {
  orgName: string;
  exposureScore: number;
  low: number;
  medium: number;
  high: number;
  extreme: number;
};

export type MovementChartDatum = {
  label: "Naik" | "Turun" | "Stabil";
  value: number;
  fill: string;
};

export type ExecutiveTrendDatum = {
  period: string;
  high: number;
  extreme: number;
  exposureScore: number;
};

function normalizeSemesterKey(value?: string) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(H[12])$/i);
  if (!match) return null;
  return `${match[1]}-${match[2].toUpperCase()}`;
}

function deriveSemester(createdAt?: string) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const half = date.getMonth() < 6 ? "H1" : "H2";
  return `${date.getFullYear()}-${half}`;
}

function semesterSortValue(period: string) {
  const [yearText, half] = period.split("-");
  return Number(yearText) * 2 + (half === "H2" ? 1 : 0);
}

function levelFromScore(probability?: number, impact?: number): Severity {
  const score = (probability ?? 0) * (impact ?? 0);
  if (score >= 17) return "Ekstrem";
  if (score >= 10) return "Tinggi";
  if (score >= 5) return "Sedang";
  return "Rendah";
}

function weightFor(level: Severity) {
  if (level === "Ekstrem") return 5;
  if (level === "Tinggi") return 3;
  if (level === "Sedang") return 2;
  return 1;
}

function isOverdue(dateText?: string | null, now = new Date()) {
  if (!dateText) return false;
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date < now;
}

export function buildUnitExposureData(risks: RiskLike[], limit = 5): UnitExposureDatum[] {
  const grouped = new Map<string, UnitExposureDatum>();

  for (const risk of risks) {
    const orgName = risk.orgName?.trim() || "Tanpa Unit";
    const level = levelFromScore(risk.probability, risk.impact);
    const row = grouped.get(orgName) ?? {
      orgName,
      exposureScore: 0,
      low: 0,
      medium: 0,
      high: 0,
      extreme: 0,
    };

    row.exposureScore += weightFor(level);
    if (level === "Rendah") row.low += 1;
    if (level === "Sedang") row.medium += 1;
    if (level === "Tinggi") row.high += 1;
    if (level === "Ekstrem") row.extreme += 1;
    grouped.set(orgName, row);
  }

  return [...grouped.values()]
    .sort((left, right) => right.exposureScore - left.exposureScore || left.orgName.localeCompare(right.orgName))
    .slice(0, limit);
}

export function buildMovementChartData(comparisons: ComparisonLike[]): MovementChartDatum[] {
  const counts = { up: 0, down: 0, stable: 0 };

  for (const item of comparisons) {
    if (item.movement === "up") counts.up += 1;
    else if (item.movement === "down") counts.down += 1;
    else counts.stable += 1;
  }

  return [
    { label: "Naik", value: counts.up, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: counts.down, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: counts.stable, fill: "oklch(0.60 0.02 265 / 55%)" },
  ];
}

export function buildExecutiveTrendData(risks: RiskLike[]): ExecutiveTrendDatum[] {
  const grouped = new Map<string, ExecutiveTrendDatum>();

  for (const risk of risks) {
    const period = normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
    if (!period) continue;

    const level = levelFromScore(risk.probability, risk.impact);
    const row = grouped.get(period) ?? { period, high: 0, extreme: 0, exposureScore: 0 };
    if (level === "Tinggi") row.high += 1;
    if (level === "Ekstrem") row.extreme += 1;
    row.exposureScore += weightFor(level);
    grouped.set(period, row);
  }

  return [...grouped.values()].sort((left, right) => semesterSortValue(left.period) - semesterSortValue(right.period));
}

export function buildTopRiskBadgeMap(input: {
  topRisks: Array<Pick<RiskLike, "code">>;
  allRisks: RiskLike[];
  comparisons: ComparisonLike[];
  currentCycle: string;
  now?: Date;
}) {
  const allByCode = new Map(input.allRisks.map((risk) => [risk.code, risk]));
  const comparisonByCode = new Map(input.comparisons.map((item) => [item.code, item]));
  const result: Record<string, string[]> = {};

  for (const risk of input.topRisks) {
    if (!risk.code) continue;

    const current = allByCode.get(risk.code);
    const comparison = comparisonByCode.get(risk.code);
    const badges: string[] = [];

    if (comparison?.movement === "up") badges.push("Naik level");
    if (comparison?.movement === "down") badges.push("Turun level");
    if (!comparison && current?.assessmentCycle === input.currentCycle) badges.push("Baru");
    if (isOverdue(current?.nextReviewDate, input.now)) badges.push("Overdue");

    result[risk.code] = badges;
  }

  return result;
}
```

- [ ] **Step 4: Run the helper test again and make sure it passes**

Run:

```bash
node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: PASS with 4 passing tests.

- [ ] **Step 5: Commit the helper module**

```bash
git add src/lib/dashboard-insights.ts src/lib/dashboard-insights.test.ts
git commit -m "feat: add dashboard insight transforms"
```

### Task 2: Replace Reports Pie Chart and Add Risk Movement Chart

**Files:**
- Modify: `frontend/src/app/(app)/reports/page.tsx`
- Reuse: `frontend/src/lib/dashboard-insights.ts`
- Reuse: `frontend/src/lib/risk-report-trend.ts`
- Reference: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`

- [ ] **Step 1: Extend the helper test with a report-facing empty-state case**

Append this test to `frontend/src/lib/dashboard-insights.test.ts`:

```ts
test("buildUnitExposureData and buildMovementChartData return empty-friendly arrays", () => {
  assert.deepEqual(buildUnitExposureData([]), []);
  assert.deepEqual(buildMovementChartData([]), [
    { label: "Naik", value: 0, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: 0, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: 0, fill: "oklch(0.60 0.02 265 / 55%)" },
  ]);
});
```

- [ ] **Step 2: Run the helper test and verify it passes before wiring the page**

Run:

```bash
node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: PASS with 5 passing tests.

- [ ] **Step 3: Refactor `reports/page.tsx` to fetch comparison data and render the new charts**

Update the imports and state near the top of `frontend/src/app/(app)/reports/page.tsx` to:

```tsx
import {
  buildMovementChartData,
  buildUnitExposureData,
} from "@/lib/dashboard-insights";
import type { RiskCycleComparisonItem } from "@/types/risk";

function previousGlobalCycle(cycle: string) {
  const [yearPart, half] = cycle.split("-");
  const year = Number(yearPart);
  if (half === "H1") return `${year - 1}-H2`;
  return `${year}-H1`;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [risks, setRisks] = useState<RiskTrendSourceItem[]>([]);
  const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
  const [trendWindow, setTrendWindow] = useState<RiskTrendWindow>("4s");
  const [exportCycle, setExportCycle] = useState(currentGlobalCycle());
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => previousGlobalCycle(currentCycle), [currentCycle]);
  const cycleOptions = useMemo(() => buildRecentCycleOptions(), []);

  const trendData = useMemo(
    () => buildRiskTrendData(risks, trendWindow, trendColors).trendData,
    [risks, trendWindow],
  );
  const unitExposureData = useMemo(() => buildUnitExposureData(risks, 5), [risks]);
  const movementData = useMemo(() => buildMovementChartData(comparisons), [comparisons]);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      api.get<RiskTrendSourceItem[]>("/risks", token),
      api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${currentCycle}`, token),
    ])
      .then(([riskData, comparisonData]) => {
        setRisks(riskData);
        setComparisons(comparisonData);
      })
      .catch(console.error);
  }, [token, currentCycle, previousCycle]);
```

Replace the current right-side pie chart card with two stacked cards: a movement summary card and a top-unit exposure card.

```tsx
<div className="grid gap-6 lg:grid-cols-2">
  <Card className="border-border/50 bg-card/80">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="size-4" />
        Risk Trend Report
      </CardTitle>
    </CardHeader>
    <CardContent>{/* keep the existing stacked trend chart */}</CardContent>
  </Card>

  <div className="space-y-6">
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Risk Movement Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={movementData} margin={{ top: 5, right: 12, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <RechartsTooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {movementData.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>

    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Top Unit Exposure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={unitExposureData} margin={{ top: 0, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="orgName" type="category" width={120} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <RechartsTooltip />
              <Bar dataKey="exposureScore" fill="oklch(0.68 0.17 35)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
```

Delete the old `pieData`, `visiblePieData`, `renderedPieData`, and `piePaddingAngle` code, plus the `RPieChart`, `Pie`, and `PieChart` imports that are no longer needed.

- [ ] **Step 4: Lint the reports page and verify there are no unused imports or type errors**

Run:

```bash
npm run lint -- "src/app/(app)/reports/page.tsx" "src/lib/dashboard-insights.ts" "src/lib/dashboard-insights.test.ts"
```

Expected: PASS with no ESLint errors.

- [ ] **Step 5: Commit the reports page changes**

```bash
git add "src/app/(app)/reports/page.tsx" src/lib/dashboard-insights.ts src/lib/dashboard-insights.test.ts
git commit -m "feat: add executive risk charts to reports"
```

### Task 3: Refocus Overview Trend and Enrich Top Risks

**Files:**
- Modify: `frontend/src/app/(app)/overview/page.tsx`
- Reuse: `frontend/src/lib/dashboard-insights.ts`
- Reuse: `frontend/src/types/risk.ts`
- Reference: `frontend/src/app/(app)/risk/register/page.tsx`

- [ ] **Step 1: Add a regression helper test for chronological overview trend output**

Append this test to `frontend/src/lib/dashboard-insights.test.ts`:

```ts
test("buildExecutiveTrendData sorts semester output chronologically for overview charts", () => {
  const result = buildExecutiveTrendData([
    { assessmentCycle: "2026-H1", probability: 4, impact: 3 },
    { assessmentCycle: "2025-H2", probability: 4, impact: 4 },
  ]);

  assert.deepEqual(result.map((item) => item.period), ["2025-H2", "2026-H1"]);
});
```

- [ ] **Step 2: Run the helper test file and verify the new test passes before wiring overview**

Run:

```bash
node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: PASS with 6 passing tests.

- [ ] **Step 3: Update `overview/page.tsx` to use executive trend data and top-risk badges**

Add imports and local cycle helpers near the top of `frontend/src/app/(app)/overview/page.tsx`:

```tsx
import type { Risk, RiskCycleComparisonItem } from "@/types/risk";
import {
  buildExecutiveTrendData,
  buildTopRiskBadgeMap,
} from "@/lib/dashboard-insights";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function previousGlobalCycle(cycle: string) {
  const [yearPart, half] = cycle.split("-");
  const year = Number(yearPart);
  if (half === "H1") return `${year - 1}-H2`;
  return `${year}-H1`;
}
```

Replace the `any[]` state with typed risk and comparison state:

```tsx
const [topRisks, setTopRisks] = useState<Risk[]>([]);
const [allRisks, setAllRisks] = useState<Risk[]>([]);
const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
const [trendData, setTrendData] = useState<Array<{ period: string; high: number; extreme: number; exposureScore: number }>>([]);

const currentCycle = currentGlobalCycle();
const previousCycle = previousGlobalCycle(currentCycle);
```

Update the main `Promise.all` block so overview fetches compare data and reuses the helper:

```tsx
Promise.all([
  api.get("/dashboard/summary", token),
  api.get<number[][]>("/dashboard/heatmap", token),
  api.get<Risk[]>("/dashboard/top-risks?limit=5", token),
  api.get<Risk[]>("/risks", token),
  api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${currentCycle}`, token),
]).then(([sum, heat, top, risks, comparisonData]) => {
  setSummary(sum);
  setHeatmapData(heat);
  setTopRisks(top);
  setAllRisks(risks);
  setComparisons(comparisonData);
  setTrendData(buildExecutiveTrendData(risks));
  setLoading(false);
}).catch(console.error);
```

Create the badge lookup with `useMemo`:

```tsx
const topRiskBadgeMap = useMemo(
  () => buildTopRiskBadgeMap({
    topRisks,
    allRisks,
    comparisons,
    currentCycle,
  }),
  [topRisks, allRisks, comparisons, currentCycle],
);
```

In the top-risks card, render the badge row under the risk title:

```tsx
{(topRiskBadgeMap[risk.code || ""] || []).length > 0 ? (
  <div className="mt-1 flex flex-wrap gap-1">
    {(topRiskBadgeMap[risk.code || ""] || []).map((badge) => (
      <Badge
        key={`${risk.code}-${badge}`}
        variant="outline"
        className={cn(
          "h-4 px-1.5 text-[9px]",
          badge === "Naik level" && "border-risk-high/30 bg-risk-high/10 text-risk-high",
          badge === "Turun level" && "border-success/30 bg-success/10 text-success",
          badge === "Baru" && "border-primary/30 bg-primary/10 text-primary",
          badge === "Overdue" && "border-warning/30 bg-warning/10 text-warning",
        )}
      >
        {badge}
      </Badge>
    ))}
  </div>
) : null}
```

Refocus the trend chart so it shows `high`, `extreme`, and `exposureScore` instead of the old stacked four-level composition.

Use this chart body inside the existing trend card:

```tsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={trendData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }} axisLine={false} tickLine={false} />
    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }} axisLine={false} tickLine={false} />
    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }} axisLine={false} tickLine={false} />
    <RechartsTooltip />
    <Bar yAxisId="left" dataKey="high" fill="oklch(0.70 0.18 40)" radius={[4, 4, 0, 0]} />
    <Bar yAxisId="left" dataKey="extreme" fill="oklch(0.62 0.22 27)" radius={[4, 4, 0, 0]} />
    <Bar yAxisId="right" dataKey="exposureScore" fill="oklch(0.55 0.05 260 / 35%)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Update the card copy from `Komposisi risiko per periode kuartal` to `Eksposur high/extreme per semester`.

- [ ] **Step 4: Lint the overview page and manually inspect the two upgraded widgets**

Run:

```bash
npm run lint -- "src/app/(app)/overview/page.tsx" "src/lib/dashboard-insights.ts" "src/lib/dashboard-insights.test.ts"
```

Expected: PASS with no ESLint errors.

Then run:

```bash
npm run dev
```

Manual check in the browser:

```text
1. Open /overview.
2. Confirm the trend chart now emphasizes High, Extreme, and Exposure Score.
3. Confirm top risks show movement and overdue badges when matching data exists.
4. Confirm empty comparison data does not crash the page.
```

- [ ] **Step 5: Commit the overview changes**

```bash
git add "src/app/(app)/overview/page.tsx" src/lib/dashboard-insights.ts src/lib/dashboard-insights.test.ts
git commit -m "feat: add executive overview risk signals"
```

### Task 4: Final Verification Pass

**Files:**
- Verify: `frontend/src/app/(app)/reports/page.tsx`
- Verify: `frontend/src/app/(app)/overview/page.tsx`
- Verify: `frontend/src/lib/dashboard-insights.ts`
- Verify: `frontend/src/lib/dashboard-insights.test.ts`

- [ ] **Step 1: Run the shared node tests one last time**

Run:

```bash
node --test --experimental-strip-types src/lib/dashboard-insights.test.ts src/lib/risk-report-trend.test.ts
```

Expected: PASS for all tests.

- [ ] **Step 2: Run focused linting for the changed files**

Run:

```bash
npm run lint -- "src/app/(app)/reports/page.tsx" "src/app/(app)/overview/page.tsx" "src/lib/dashboard-insights.ts" "src/lib/dashboard-insights.test.ts"
```

Expected: PASS with no ESLint errors.

- [ ] **Step 3: Run a production build check for the frontend**

Run:

```bash
npm run build
```

Expected: PASS and Next.js completes the build successfully.

- [ ] **Step 4: Validate executive acceptance criteria manually**

Use this checklist:

```text
1. Reports no longer contains the pie chart.
2. Reports shows Top Unit Exposure and Risk Movement Report.
3. Overview trend emphasizes executive signals, not four-level composition.
4. Top risks show meaningful context badges.
5. Empty or low-data environments render fallback cards without layout collapse.
```

- [ ] **Step 5: Commit the final verified state**

```bash
git add "src/app/(app)/reports/page.tsx" "src/app/(app)/overview/page.tsx" src/lib/dashboard-insights.ts src/lib/dashboard-insights.test.ts
git commit -m "feat: improve executive dashboard insights"
```
