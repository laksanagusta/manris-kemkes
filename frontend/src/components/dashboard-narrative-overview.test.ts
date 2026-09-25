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
const topRisksCard = read(
  "../app/(app)/overview/_components/top-risks-panel.tsx",
);
const dashboardKpiCard = read(
  "./shared/design-system/layout/dashboard-kpi-card.tsx",
);
const tablePrimitive = read("./ui/table.tsx");
const appHeader = read("./app-header.tsx");
const designSystemPage = read("../app/(app)/design-system/page.tsx");
const designDocument = read("../../../DESIGN.md");

test("overview follows the approved narrative order", () => {
  const kpis = overviewPage.indexOf('data-dashboard-section="kpis"');
  const trend = overviewPage.indexOf('data-dashboard-section="trend"');
  const priorities = overviewPage.indexOf(
    'data-dashboard-section="priorities"',
  );

  assert.ok(kpis >= 0);
  assert.ok(trend > kpis);
  assert.ok(priorities > trend);
  assert.match(overviewPage, /title: "Total"/);
  assert.match(overviewPage, /title: "Prioritas"/);
  assert.match(overviewPage, /title: "Mitigasi belum terlapor"/);
  assert.match(overviewPage, /title: "Eksposur"/);
  assert.doesNotMatch(overviewPage, /Total Risiko|Risiko Tinggi & Sangat Tinggi|Penanganan Overdue|Risk Exposure/);
  assert.doesNotMatch(overviewPage, /<CollectionPageHeader[\s>]/);
  assert.doesNotMatch(overviewPage, /data-dashboard-section="multi-phase"/);
  assert.match(
    appHeader,
    /pathname === "\/overview"[\s\S]*pathname === "\/risk\/register\/new"/,
  );
});

test("overview KPI labels name their metric clearly", () => {
  for (const label of ["Total", "Prioritas", "Mitigasi belum terlapor", "Eksposur"]) {
    assert.match(overviewPage, new RegExp(`title: "${label}"`));
  }
  assert.doesNotMatch(
    overviewPage,
    /Total Risiko|Risiko Tinggi & Sangat Tinggi|Penanganan Overdue|Risk Exposure/,
  );
});

test("unreported mitigation KPI uses its dedicated dashboard metric", () => {
  assert.match(overviewPage, /unreportedMitigations: number/);
  assert.match(overviewPage, /const unreportedMitigations = summary\?\.unreportedMitigations/);
  assert.match(overviewPage, /String\(unreportedMitigations\)/);
  assert.doesNotMatch(overviewPage, /const overdueMitigations = summary\?\.overdueMitigations/);
});

test("overview and catalogue use the same dashboard primitives", () => {
  assert.match(overviewPage, /<DashboardKpiCard[\s>]/);
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

test("dashboard cards use concise contextual subtitles", () => {
  assert.doesNotMatch(overviewPage, /Seluruh risiko aktif/);
  assert.doesNotMatch(overviewPage, /Prioritas pengendalian/);
  assert.doesNotMatch(overviewPage, /Perlu tindak lanjut/);
  assert.doesNotMatch(overviewPage, /Indeks eksposur tertimbang/);
  assert.doesNotMatch(
    trendCard,
    /Perbandingan skor aktual dan target dalam empat kuartal terakhir/,
  );
  assert.match(
    topRisksCard,
    /subtitle="Prioritas berdasarkan skor risiko tertinggi\."/,
  );
  assert.match(
    currentHeatmap,
    /subtitle="Distribusi probabilitas dan dampak pada kuartal berjalan\."/,
  );
  assert.doesNotMatch(currentHeatmap, /risiko aktif terpetakan/);
  assert.match(trendCard, /className="font-mono font-medium text-foreground/);
});

test("dashboard KPI titles use the shared muted 12px label", () => {
  assert.match(
    dashboardKpiCard,
    /<CardTitle className="text-xs text-muted-foreground">/,
  );
  assert.doesNotMatch(dashboardKpiCard, /uppercase|tracking-\[1px\]/);
});

test("dashboard KPI surfaces use the stock Card composition", () => {
  assert.match(dashboardKpiCard, /<Card aria-busy=\{loading\}>/);
  assert.match(dashboardKpiCard, /<CardHeader>/);
  assert.match(dashboardKpiCard, /<CardContent className="flex flex-col gap-2">/);
  assert.doesNotMatch(dashboardKpiCard, /data-corner-smoothing|surface-hairline/);
});

test("attention risk list uses the shared table surface", () => {
  assert.match(topRisksCard, /<Table[\s\S]*aria-label="Risiko yang perlu perhatian"/);
  assert.match(topRisksCard, /<CollectionTableHeader(?:\s[^>]*)?>/);
  assert.match(topRisksCard, /<CollectionTableHeader>/);
  assert.doesNotMatch(topRisksCard, /\[&_th\]:bg-card/);
  assert.match(
    topRisksCard,
    /<CollectionTableHeaderRow[\s\S]*data-testid="risk-list-header"/,
  );
  assert.match(tablePrimitive, /bg-table-header/);
});

test("attention risk table inherits canonical header spacing and typography", () => {
  assert.match(tablePrimitive, /h-10 bg-table-header px-2 text-left/);
  assert.match(tablePrimitive, /text-\[13px\] font-medium/);
  assert.match(tablePrimitive, /first:ps-4 last:pe-4/);
});

test("attention risk rows prioritize titles and keep codes as metadata", () => {
  assert.match(
    topRisksCard,
    /text-sm font-medium leading-5 text-foreground/,
  );
  assert.match(
    topRisksCard,
    /font-mono text-\[11px\] leading-4 text-muted-foreground/,
  );
});

test("narrative overview is documented in both design-system surfaces", () => {
  assert.match(designSystemPage, /Narrative Overview/);
  assert.match(
    designSystemPage,
    /condition.*change.*attention.*concentrated risk.*multi-fase/is,
  );
  assert.match(
    designDocument,
    /narrative overview orders KPI condition, trend change, attention risks, and the current heatmap/i,
  );
  assert.match(
    designDocument,
    /shared collection table header and stock `Table` cells/,
  );
  assert.match(
    designDocument,
    /multi-phase comparison action in `CardAction`/,
  );
});
