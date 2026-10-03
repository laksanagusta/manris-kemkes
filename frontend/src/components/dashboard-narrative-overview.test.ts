import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const overviewPage = read("../app/(app)/overview/page.tsx");
const catalogue = read(
  "./shared/design-system/examples/overview-dashboard-example.tsx",
);
const currentHeatmap = read(
  "../app/(app)/overview/_components/current-risk-heatmap.tsx",
);
const multiPhaseHeatmap = read(
  "../app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx",
);
const trendCard = read(
  "../app/(app)/overview/_components/risk-count-trend-chart.tsx",
);
const compositionTrend = read(
  "../app/(app)/overview/_components/risk-composition-trend-chart.tsx",
);
const dashboardKpiCard = read(
  "./shared/design-system/layout/dashboard-kpi-card.tsx",
);
const appHeader = read("./app-header.tsx");
const designSystemPage = read("../app/(app)/design-system/page.tsx");
const designDocument = read("../../../DESIGN.md");

test("overview follows the approved narrative order", () => {
  const trend = overviewPage.indexOf('data-dashboard-section="trend"');
  const composition = overviewPage.indexOf(
    'data-dashboard-section="composition"',
  );

  assert.doesNotMatch(overviewPage, /data-dashboard-section="kpis"/);
  assert.doesNotMatch(overviewPage, /<MetricGrid[\s>]/);
  assert.doesNotMatch(overviewPage, /<DashboardKpiCard[\s>]/);
  assert.ok(trend >= 0);
  assert.ok(composition > trend);
  assert.match(overviewPage, /currentTotal=\{totalRisks\}/);
  assert.doesNotMatch(overviewPage, /Total Risiko|Risiko Tinggi & Sangat Tinggi|Penanganan Overdue|Risk Exposure/);
  assert.doesNotMatch(overviewPage, /data-dashboard-section="multi-phase"/);
  assert.match(
    appHeader,
    /pathname === "\/overview"[\s\S]*pathname === "\/risk\/register\/new"/,
  );
});

test("overview shows the current total below the risk-count trend header", () => {
  assert.match(trendCard, /currentTotal\?: number/);
  assert.match(trendCard, /summary=\{/);
  assert.match(trendCard, /\{currentTotal \?\? "—"\}/);
  assert.match(trendCard, /risiko terdaftar/);
});

test("overview summary fetch only tracks the current total", () => {
  assert.match(overviewPage, /totalRisks: number/);
  assert.match(overviewPage, /const totalRisks = summary\?\.totalRisks/);
  assert.doesNotMatch(overviewPage, /unreportedMitigations/);
  assert.doesNotMatch(overviewPage, /overdueMitigations/);
  assert.doesNotMatch(overviewPage, /highExtreme/);
});

test("overview and catalogue use the same dashboard primitives", () => {
  assert.doesNotMatch(overviewPage, /<DashboardKpiCard[\s>]/);
  assert.match(catalogue, /<DashboardKpiCard[\s>]/);
  assert.match(currentHeatmap, /<RiskHeatmapGrid[\s>]/);
  assert.match(catalogue, /<RiskHeatmapGrid[\s>]/);
  assert.match(currentHeatmap, /<Dialog[\s>]/);
  assert.match(currentHeatmap, /<MultiPhaseHeatmapCompareCard surface="plain"/);
  assert.match(
    multiPhaseHeatmap,
    /surface === "plain"[\s\S]*className="min-h-0 min-w-0"/,
  );
  assert.match(
    currentHeatmap,
    /aria-label="Buka perbandingan heatmap multi-fase"/,
  );
  assert.match(
    currentHeatmap,
    /<Button[\s\S]*size="icon-sm"[\s\S]*aria-label="Buka perbandingan heatmap multi-fase"[\s\S]*<ArrowExpand aria-hidden="true" \/>/,
  );
  assert.doesNotMatch(currentHeatmap, /\n\s*Bandingkan\n/);
  assert.match(currentHeatmap, /className="h-full"/);
  assert.match(currentHeatmap, /contentClassName="flex flex-1 flex-col"/);
  assert.match(currentHeatmap, /Probabilitas[\s\S]*<RiskHeatmapGrid/);
  assert.match(currentHeatmap, /text-center text-xs text-muted-foreground[\s\S]*Dampak/);
  assert.doesNotMatch(currentHeatmap, /absolute bottom-0|translate-y-1\/2/);
  assert.match(catalogue, /size="icon-sm"[\s\S]*aria-label="Buka perbandingan heatmap multi-fase"/);
  assert.doesNotMatch(catalogue, /\n\s*Bandingkan\n/);
  assert.match(
    overviewPage,
    /xl:grid-cols-\[minmax\(0,2fr\)_minmax\(22rem,1fr\)\]/,
  );
});

test("dashboard cards use concise title-only headers", () => {
  assert.doesNotMatch(overviewPage, /Seluruh risiko aktif/);
  assert.doesNotMatch(overviewPage, /Prioritas pengendalian/);
  assert.doesNotMatch(overviewPage, /Perlu tindak lanjut/);
  assert.doesNotMatch(overviewPage, /Indeks eksposur tertimbang/);
  assert.doesNotMatch(
    trendCard,
    /Perbandingan skor aktual dan target dalam empat kuartal terakhir/,
  );
  assert.doesNotMatch(compositionTrend, /subtitle=/);
  assert.doesNotMatch(currentHeatmap, /subtitle=/);
  assert.doesNotMatch(trendCard, /subtitle=/);
  assert.doesNotMatch(currentHeatmap, /risiko aktif terpetakan/);
  assert.match(trendCard, /className="font-mono font-medium text-foreground/);
});

test("dashboard KPI titles use the shared muted 14px label", () => {
  assert.match(
    dashboardKpiCard,
    /<CardTitle className="text-sm text-muted-foreground">/,
  );
  assert.doesNotMatch(dashboardKpiCard, /uppercase|tracking-\[1px\]/);
});

test("dashboard KPI surfaces use the stock Card composition", () => {
  assert.match(dashboardKpiCard, /<Card aria-busy=\{loading\}>/);
  assert.match(dashboardKpiCard, /<CardHeader>/);
  assert.match(dashboardKpiCard, /<CardContent className="flex flex-col gap-2">/);
  assert.doesNotMatch(dashboardKpiCard, /data-corner-smoothing|surface-hairline/);
});

test("dashboard composition uses quarterly snapshots and five semantic risk levels", () => {
  assert.match(overviewPage, /<RiskCompositionTrendChart[\s>]/);
  assert.doesNotMatch(overviewPage, /TopRisksPanel|dashboard\/top-risks/);
  assert.match(compositionTrend, /buildRiskCountTrendData/);
  assert.match(compositionTrend, /stackId="risk-level"/);
  assert.match(compositionTrend, /RISK_CHART_COLORS/);
  assert.match(
    compositionTrend,
    /sangatRendah[\s\S]*rendah[\s\S]*sedang[\s\S]*tinggi[\s\S]*sangatTinggi/,
  );
  assert.match(compositionTrend, /period\?\.totalRisks/);
  assert.match(compositionTrend, /isAnimationActive=\{false\}/);
});

test("narrative overview is documented in both design-system surfaces", () => {
  assert.match(designSystemPage, /Narrative Overview/);
  assert.match(
    designSystemPage,
    /tren jumlah risiko dengan total saat ini di bawah header kartu, distribusi kategori saat ini, komposisi tingkat risiko lintas empat kuartal, lalu heatmap kuartal berjalan/i,
  );
  assert.match(
    designDocument,
    /overview orders the total-risk trend \(current total below its header\), current risk-category distribution, four-quarter risk-level composition, and current heatmap/i,
  );
  assert.match(
    designDocument,
    /composition card replaces the dashboard's risk-attention list/i,
  );
  assert.match(
    designDocument,
    /multi-phase comparison action in `CardAction`/,
  );
});
