# Dashboard Reviewed Score, Progress, and Review Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace residual reporting with reviewed-score reporting, add latest approved progress per organization, align top-risk badge colors with heatmap semantics, and add a confirmation dialog before risk review submission.

**Architecture:** Keep the work frontend-first and reuse existing shared risk semantics in `frontend/src/lib/risk.ts`. Put new aggregation logic in `frontend/src/lib/dashboard-insights.ts`, keep report rendering in dedicated chart components, and preserve the existing `/approvals/submit` submission flow by wrapping it with an `AlertDialog` confirmation step.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Recharts, React Hook Form, Node `node:test`, ESLint

---

### Task 1: Update Dashboard Insight Semantics in Tests First

**Files:**
- Modify: `frontend/src/lib/dashboard-insights.test.ts`
- Modify: `frontend/src/lib/dashboard-insights.ts`
- Reference: `frontend/src/lib/risk.ts`

- [ ] **Step 1: Write the failing tests for reviewed score trend and latest organization progress**

Update `frontend/src/lib/dashboard-insights.test.ts` imports and add these tests above `buildMovementSnapshotData` coverage:

```ts
import {
  buildCriticalRiskRateTrendData,
  buildExecutiveTrendData,
  buildInherentResidualTrendData,
  buildLatestOrganizationProgressData,
  buildMovementChartData,
  buildMovementSnapshotData,
  buildTopRiskBadgeMap,
  buildUnitExposureData,
} from "./dashboard-insights.ts";

test("buildInherentResidualTrendData uses approved reviewed score instead of target score", () => {
  const result = buildInherentResidualTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2026-H1",
      inherentScore: 20,
      targetScore: 6,
      reviewedProbability: 2,
      reviewedImpact: 3,
      reviewedWeight: 1,
      reviewedNilai: 6,
      reviewedScore: 6,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2026-H1", avgInherent: 20, avgResidual: 6, gap: 14, riskCount: 1 },
  ]);
});

test("buildInherentResidualTrendData falls back to inherent score when reviewed bundle is partial", () => {
  const result = buildInherentResidualTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2026-H1",
      inherentScore: 20,
      targetScore: 4,
      reviewedProbability: 2,
      reviewedImpact: 3,
      reviewedWeight: 1,
      reviewedNilai: 6,
      reviewedScore: null,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2026-H1", avgInherent: 20, avgResidual: 20, gap: 0, riskCount: 1 },
  ]);
});

test("buildLatestOrganizationProgressData keeps only latest cycle per organization", () => {
  const result = buildLatestOrganizationProgressData([
    makeDashboardRisk({ code: "R-001", orgName: "Direktorat A", assessmentCycle: "2025-H2", status: "approved" }),
    makeDashboardRisk({ code: "R-002", orgName: "Direktorat A", assessmentCycle: "2026-H1", status: "approved" }),
    makeDashboardRisk({ code: "R-003", orgName: "Direktorat A", assessmentCycle: "2026-H1", status: "draft" }),
    makeDashboardRisk({ code: "R-004", orgName: "Direktorat B", assessmentCycle: "2025-H2", status: "draft" }),
    makeDashboardRisk({ code: "R-005", orgName: "Direktorat B", assessmentCycle: "2025-H2", status: "approved" }),
  ]);

  assert.deepEqual(result, [
    {
      orgName: "Direktorat A",
      period: "2026-H1",
      approvedCount: 1,
      totalCount: 2,
      approvedPercent: 50,
    },
    {
      orgName: "Direktorat B",
      period: "2025-H2",
      approvedCount: 1,
      totalCount: 2,
      approvedPercent: 50,
    },
  ]);
});

test("buildLatestOrganizationProgressData keeps zero-approved latest cycles visible", () => {
  const result = buildLatestOrganizationProgressData([
    makeDashboardRisk({ code: "R-010", orgName: "Direktorat C", assessmentCycle: "2026-H1", status: "draft" }),
    makeDashboardRisk({ code: "R-011", orgName: "Direktorat C", assessmentCycle: "2026-H1", status: "in_review" }),
  ]);

  assert.deepEqual(result, [
    {
      orgName: "Direktorat C",
      period: "2026-H1",
      approvedCount: 0,
      totalCount: 2,
      approvedPercent: 0,
    },
  ]);
});
```

- [ ] **Step 2: Run the test file and verify it fails for the new semantics and missing helper export**

Run:

```bash
cd frontend && node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: FAIL because `buildLatestOrganizationProgressData` is not exported yet and the old `buildInherentResidualTrendData` still uses `targetScore`.

- [ ] **Step 3: Implement the minimal helper changes in `dashboard-insights.ts`**

Update `frontend/src/lib/dashboard-insights.ts` with these additions and replacements:

```ts
export type LatestOrganizationProgressDatum = {
  orgName: string;
  period: string;
  approvedCount: number;
  totalCount: number;
  approvedPercent: number;
};

function resolveRiskPeriod(risk: Pick<RiskLike, "assessmentCycle" | "createdAt">) {
  return normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
}

export function buildLatestOrganizationProgressData(
  risks: RiskLike[],
): LatestOrganizationProgressDatum[] {
  const grouped = new Map<
    string,
    { period: string; sortValue: number; approvedCount: number; totalCount: number }
  >();

  for (const risk of risks) {
    const orgName = risk.orgName?.trim() || "Tanpa Unit";
    const period = resolveRiskPeriod(risk);
    if (!period) continue;

    const sortValue = semesterSortValue(period);
    const existing = grouped.get(orgName);

    if (!existing || sortValue > existing.sortValue) {
      grouped.set(orgName, {
        period,
        sortValue,
        approvedCount: risk.status === "approved" ? 1 : 0,
        totalCount: 1,
      });
      continue;
    }

    if (sortValue === existing.sortValue) {
      existing.totalCount += 1;
      if (risk.status === "approved") existing.approvedCount += 1;
    }
  }

  return [...grouped.entries()]
    .map(([orgName, bucket]) => ({
      orgName,
      period: bucket.period,
      approvedCount: bucket.approvedCount,
      totalCount: bucket.totalCount,
      approvedPercent:
        bucket.totalCount === 0
          ? 0
          : Math.round((bucket.approvedCount / bucket.totalCount) * 1000) / 10,
    }))
    .sort(
      (left, right) =>
        right.approvedPercent - left.approvedPercent ||
        right.totalCount - left.totalCount ||
        left.orgName.localeCompare(right.orgName),
    );
}

export function buildInherentResidualTrendData(
  risks: RiskLike[],
): InherentResidualDatum[] {
  const grouped = new Map<
    string,
    { inherentSum: number; residualSum: number; count: number }
  >();

  for (const risk of risks) {
    const period = resolveRiskPeriod(risk);
    if (!period) continue;

    const semantics = resolveRiskScoreSemantics({
      status: risk.status ?? "draft",
      probability: risk.probability ?? 1,
      impact: risk.impact ?? 1,
      weight: risk.weight ?? getBobot(risk.probability ?? 1, risk.impact ?? 1),
      nilai: risk.nilai ?? undefined,
      inherentScore: risk.inherentScore ?? 0,
      reviewedProbability: risk.reviewedProbability,
      reviewedImpact: risk.reviewedImpact,
      reviewedWeight: risk.reviewedWeight,
      reviewedNilai: risk.reviewedNilai,
      reviewedScore: risk.reviewedScore,
    });

    const bucket = grouped.get(period) ?? {
      inherentSum: 0,
      residualSum: 0,
      count: 0,
    };

    bucket.inherentSum += semantics.inherent.score;
    bucket.residualSum += semantics.effective.score;
    bucket.count += 1;
    grouped.set(period, bucket);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => semesterSortValue(a) - semesterSortValue(b))
    .map(([period, bucket]) => {
      const avgInherent = Math.round((bucket.inherentSum / bucket.count) * 10) / 10;
      const avgResidual = Math.round((bucket.residualSum / bucket.count) * 10) / 10;

      return {
        period,
        avgInherent,
        avgResidual,
        gap: Math.round((avgInherent - avgResidual) * 10) / 10,
        riskCount: bucket.count,
      };
    });
}
```

- [ ] **Step 4: Re-run the helper tests and verify they pass**

Run:

```bash
cd frontend && node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: PASS for the new reviewed-trend and organization-progress cases.

---

### Task 2: Add Reports UI for Reviewed Trend and Latest Organization Progress

**Files:**
- Create: `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx`
- Modify: `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`
- Modify: `frontend/src/app/(app)/reports/page.tsx`
- Reference: `frontend/src/lib/dashboard-insights.ts`
- Reference: `frontend/src/types/risk.ts`

- [ ] **Step 1: Create the new organization progress chart component**

Create `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx` with:

```tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";

const PROGRESS_COLOR = "oklch(0.72 0.17 155)";

type OrganizationLatestProgressChartProps = {
  data?: LatestOrganizationProgressDatum[];
};

export function OrganizationLatestProgressChart({
  data = [],
}: OrganizationLatestProgressChartProps) {
  const hasData = data.length > 0;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Progress Kertas Kerja Terakhir
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Persentase risiko approved pada cycle terbaru tiap organisasi.
            </p>
          </div>
          {hasData ? (
            <Badge variant="outline" className="text-[10px]">
              {data.length} organisasi
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data progress organisasi untuk ditampilkan.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "oklch(0.6 0.02 265)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="orgName"
                  width={110}
                  tick={{ fontSize: 10, fill: "oklch(0.6 0.02 265)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item.payload as LatestOrganizationProgressDatum;
                    return [
                      `${value}%`,
                      `${payload.approvedCount}/${payload.totalCount} approved · ${payload.period}`,
                    ];
                  }}
                  contentStyle={{
                    background: "oklch(0.98 0.003 170 / 95%)",
                    border: "1px solid oklch(0.91 0.008 170)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="approvedPercent" fill={PROGRESS_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update the inherent vs reviewed chart copy**

Update the visible copy in `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`:

```tsx
<CardTitle className="text-base font-semibold">Inherent vs Reviewed Score</CardTitle>

<p className="mt-1 text-xs text-muted-foreground">
  Rata-rata skor risiko sebelum kontrol dan sesudah review per semester
</p>

<div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
  Belum ada data semester untuk menampilkan tren inherent vs reviewed.
</div>

const labels: Record<string, string> = {
  avgInherent: "Avg Inherent",
  avgResidual: "Avg Reviewed",
  gap: "Gap",
};

<span className="text-[10px] text-muted-foreground">Reviewed</span>
```

- [ ] **Step 3: Wire the new data source and chart into `reports/page.tsx`**

Update `frontend/src/app/(app)/reports/page.tsx` imports, state, data fetching, and rendering:

```tsx
import { OrganizationLatestProgressChart } from "./_components/organization-latest-progress-chart";
import {
  buildMovementChartData,
  buildMovementSnapshotData,
  buildUnitExposureData,
  buildInherentResidualTrendData,
  buildCriticalRiskRateTrendData,
  buildMovementByOrgData,
  buildLatestOrganizationProgressData,
  type MovementSnapshotDatum,
  type MovementByOrgSortKey,
} from "@/lib/dashboard-insights";

const [allRisks, setAllRisks] = useState<Risk[]>([]);

const organizationProgressData = useMemo(
  () => buildLatestOrganizationProgressData(allRisks),
  [allRisks],
);

Promise.allSettled([
  api.get<RiskTrendSourceItem[]>("/risks/trend", token),
  api.get<Risk[]>("/risks", token),
  api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}`, token),
  api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(previousCycle)}`, token),
  api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${exportCycle}`, token),
  api.get<OverdueMitigationTimelineItem[]>("/dashboard/overdue-mitigation-timeline", token),
  api.get<KRIBreachItem[]>("/dashboard/kri-breach-summary", token),
  api.get<UnitResponseTime[]>("/dashboard/unit-response-time", token),
]).then(([
  riskResult,
  allRiskResult,
  cycleRiskResult,
  previousCycleRiskResult,
  comparisonResult,
  overdueResult,
  kriBreachResult,
  responseTimeResult,
]) => {
  if (riskResult.status === "fulfilled") setTrendRisks(riskResult.value);
  else setTrendRisks([]);
  if (allRiskResult.status === "fulfilled") setAllRisks(allRiskResult.value);
  else setAllRisks([]);
  if (cycleRiskResult.status === "fulfilled") setCycleRisks(cycleRiskResult.value);
  else setCycleRisks([]);

  if (previousCycleRiskResult.status === "fulfilled") setPreviousCycleRisks(previousCycleRiskResult.value);
  else setPreviousCycleRisks([]);

  if (comparisonResult.status === "fulfilled") setComparisons(comparisonResult.value);
  else setComparisons([]);

  if (overdueResult.status === "fulfilled") setOverdueTimelineData(overdueResult.value);
  else setOverdueTimelineData([]);

  if (kriBreachResult.status === "fulfilled") setKriBreachData(kriBreachResult.value);
  else setKriBreachData([]);

  if (responseTimeResult.status === "fulfilled") setResponseTimeData(responseTimeResult.value);
  else setResponseTimeData([]);
});

<div className="grid gap-6 lg:grid-cols-3">
  <InherentResidualTrend data={inherentResidualData} />
  <CriticalRiskRateTrend data={criticalRiskRateData} />
  <OrganizationLatestProgressChart data={organizationProgressData} />
</div>
```

- [ ] **Step 4: Run lint and build to verify the new report UI compiles cleanly**

Run:

```bash
cd frontend && npm run lint -- src/app/\(app\)/reports src/lib/dashboard-insights.ts src/lib/dashboard-insights.test.ts
cd frontend && npm run build
```

Expected: both commands pass with no TypeScript or ESLint errors in the new chart integration.

---

### Task 3: Align Top Risk Badge Colors with Heatmap Semantics

**Files:**
- Modify: `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`
- Reference: `frontend/src/lib/risk.ts`

- [ ] **Step 1: Replace local badge threshold logic with shared level semantics**

Update `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx` imports and badge rendering:

```tsx
import {
  getBobot,
  getRiskLevelFromNilai,
  levelToColor,
  resolveRiskScoreSemantics,
} from "@/lib/risk";

// delete scoreColor()

{risks.slice(0, 7).map((risk) => {
  const scoreSemantics = resolveRiskScoreSemantics({
    status: risk.status,
    probability: risk.probability,
    impact: risk.impact,
    weight: getBobot(risk.probability, risk.impact),
    nilai: risk.nilai,
    inherentScore: risk.inherentScore,
    reviewedProbability: (risk as TopRiskScoreSemanticsInput).reviewedProbability,
    reviewedImpact: (risk as TopRiskScoreSemanticsInput).reviewedImpact,
    reviewedWeight: (risk as TopRiskScoreSemanticsInput).reviewedWeight,
    reviewedNilai: (risk as TopRiskScoreSemanticsInput).reviewedNilai,
    reviewedScore: (risk as TopRiskScoreSemanticsInput).reviewedScore,
  });

  const score = scoreSemantics.primary.score;
  const level = getRiskLevelFromNilai(scoreSemantics.primary.nilai);

  return (
    <div key={risk.id} data-testid="risk-row" className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-mono font-semibold text-muted-foreground">
            {risk.code}
          </span>
          <span
            className={cn(
              "inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold",
              levelToColor(level),
            )}
          >
            {score}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-medium text-foreground">{risk.title}</p>
        {risk.orgName ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{risk.orgName}</p>
        ) : null}
      </div>
      <ChevronRight className="ml-2 size-4 shrink-0 text-muted-foreground" />
    </div>
  );
})}
```

- [ ] **Step 2: Run lint and build to verify the top-risk badge compiles with the shared helpers**

Run:

```bash
cd frontend && npm run lint -- src/app/\(app\)/overview/_components/top-risks-panel.tsx
cd frontend && npm run build
```

Expected: PASS, with no unused-function error from the removed `scoreColor()` implementation.

- [ ] **Step 3: Manually verify low-severity badges now use the same green-family color as the heatmap**

Run the app and check the overview page with sample data that includes low and very-low risks:

```bash
cd frontend && npm run dev
```

Expected: a `rendah` or `sangat rendah` top-risk badge is green-toned, not orange.

---

### Task 4: Add Submit-Review Confirmation Dialog in Risk Register Form

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Reference: `frontend/src/app/(app)/risk/register/page.tsx`

- [ ] **Step 1: Add dialog state and AlertDialog imports**

Update the top of `frontend/src/app/(app)/risk/register/new/page.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
```

- [ ] **Step 2: Add a dedicated pre-submit confirmation helper**

Insert these handlers near `handleSaveDraft` and `onSubmit` helpers:

```tsx
const openSubmitReviewConfirm = () => {
  submitTarget.current = "review";
  clearErrors();

  if (!reviewerId) {
    toast.error("Pilih Reviewer terlebih dahulu.");
    return;
  }

  if (!isFinalizeReady) {
    const firstMissing = missingSections[0]?.id ?? "identifikasi";
    scrollToSection(firstMissing);
    return;
  }

  setShowSubmitReviewConfirm(true);
};

const handleConfirmSubmitReview = () => {
  submitTarget.current = "review";
  setShowSubmitReviewConfirm(false);
  void handleSubmit(onSubmit, onValidationError)();
};
```

- [ ] **Step 3: Change the button to open the dialog and add the dialog markup**

Replace the current `Ajukan review` button handler and add the dialog near the existing delete dialog:

```tsx
<Button
  className="gap-2 text-sm font-semibold px-5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
  onClick={openSubmitReviewConfirm}
  disabled={isSubmitting}
>
  {isSubmitting && submitTarget.current === "review" ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Send className="size-4" />
  )}{" "}
  Ajukan review
</Button>

<AlertDialog
  open={showSubmitReviewConfirm}
  onOpenChange={setShowSubmitReviewConfirm}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Ajukan Risiko untuk Review?</AlertDialogTitle>
      <AlertDialogDescription>
        Risiko akan disimpan lalu dikirim ke reviewer dan approval line yang
        sudah dipilih. Pastikan seluruh bagian sudah final sebelum melanjutkan.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div>
        <span className="font-medium text-foreground">Reviewer: </span>
        <span className="text-muted-foreground">{reviewerId || "-"}</span>
      </div>
      <div>
        <span className="font-medium text-foreground">Approval line: </span>
        <span className="text-muted-foreground">{approvalLine.length} orang</span>
      </div>
      <div>
        <span className="font-medium text-foreground">Bagian siap: </span>
        <span className="text-muted-foreground">{sectionStatuses.length - missingSections.length}/{sectionStatuses.length}</span>
      </div>
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmSubmitReview} disabled={isSubmitting}>
        Lanjutkan
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 4: Run lint and build, then manually verify the confirmation flow**

Run:

```bash
cd frontend && npm run lint -- src/app/\(app\)/risk/register/new/page.tsx
cd frontend && npm run build
cd frontend && npm run dev
```

Expected:

- lint/build pass
- clicking `Ajukan review` opens the confirmation dialog first
- clicking `Lanjutkan` runs the existing `/approvals/submit` flow
- clicking `Batal` closes the dialog without submitting

---

### Task 5: Final Verification Sweep

**Files:**
- Verify: `frontend/src/lib/dashboard-insights.ts`
- Verify: `frontend/src/lib/dashboard-insights.test.ts`
- Verify: `frontend/src/app/(app)/reports/_components/inherent-residual-trend.tsx`
- Verify: `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx`
- Verify: `frontend/src/app/(app)/reports/page.tsx`
- Verify: `frontend/src/app/(app)/overview/_components/top-risks-panel.tsx`
- Verify: `frontend/src/app/(app)/risk/register/new/page.tsx`

- [ ] **Step 1: Run the focused automated tests one more time**

Run:

```bash
cd frontend && node --test --experimental-strip-types src/lib/dashboard-insights.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full frontend lint and build**

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
```

Expected: PASS with no new diagnostics.

- [ ] **Step 3: Perform manual QA against the four user-visible requirements**

Check these in the browser:

1. `Inherent vs Reviewed Score` chart uses reviewed semantics, not target score.
2. `Progress Kertas Kerja Terakhir` chart shows approved percent by organization for the latest cycle.
3. top-risk low-level badge matches heatmap green semantics.
4. `Ajukan review` now requires explicit confirmation before submit.

- [ ] **Step 4: Record any pre-existing unrelated issues separately instead of broadening scope**

If lint/build or manual QA surfaces unrelated legacy issues, note them outside this change set and keep this delivery scoped to the four approved requirements.
