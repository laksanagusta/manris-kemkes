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
const trendCard = read(
  "../app/(app)/overview/_components/unit-total-risk-score-chart.tsx",
);
const topRisksCard = read(
  "../app/(app)/overview/_components/top-risks-panel.tsx",
);
const dashboardKpiCard = read(
  "./shared/design-system/layout/dashboard-kpi-card.tsx",
);
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
    /pathname === "\/overview" \|\| pathname === "\/risk\/register\/new"/,
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
    currentHeatmap,
    /aria-label="Buka perbandingan heatmap multi-fase"/,
  );
  assert.match(currentHeatmap, /className="relative h-full"/);
  assert.match(currentHeatmap, /contentClassName="px-5 pb-6 pt-3"/);
  assert.match(currentHeatmap, /translate-y-1\/2/);
  assert.doesNotMatch(currentHeatmap, /relative h-full pb-4/);
  assert.match(catalogue, /aria-label="Buka perbandingan heatmap multi-fase"/);
  assert.match(
    overviewPage,
    /xl:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(18rem,0\.65fr\)\]/,
  );
});

test("dashboard cards omit helper subtitles", () => {
  assert.doesNotMatch(overviewPage, /Seluruh risiko aktif/);
  assert.doesNotMatch(overviewPage, /Prioritas pengendalian/);
  assert.doesNotMatch(overviewPage, /Perlu tindak lanjut/);
  assert.doesNotMatch(overviewPage, /Indeks eksposur tertimbang/);
  assert.doesNotMatch(
    trendCard,
    /Perbandingan skor aktual dan target dalam empat kuartal terakhir/,
  );
  assert.doesNotMatch(
    topRisksCard,
    /Prioritas berdasarkan skor risiko tertinggi/,
  );
  assert.doesNotMatch(
    currentHeatmap,
    /Distribusi probabilitas dan dampak pada kuartal berjalan/,
  );
  assert.doesNotMatch(currentHeatmap, /risiko aktif terpetakan/);
  assert.match(trendCard, /className="font-mono font-medium text-foreground/);
});

test("dashboard KPI titles use an 11px semibold label", () => {
  const titleClass = dashboardKpiCard.match(/<h2 className="([^"]+)"/)?.[1] ?? "";
  assert.match(
    dashboardKpiCard,
    /className="font-sans text-\[11px\] leading-4 font-semibold uppercase tracking-\[1px\] text-muted-foreground text-pretty"/,
  );
  assert.doesNotMatch(titleClass, /text-xs|text-\[13px\]|font-normal|font-medium|tracking-normal/);
  assert.match(dashboardKpiCard, /uppercase/);
  assert.match(dashboardKpiCard, /className="mt-6 flex items-baseline gap-1"/);
  assert.doesNotMatch(dashboardKpiCard, /className="mt-3 flex items-baseline gap-1"/);
});

test("attention risk list uses a white card surface for its header", () => {
  assert.match(topRisksCard, /data-testid="risk-list-header"[\s\S]*bg-card/);
  assert.doesNotMatch(topRisksCard, /data-testid="risk-list-header"[\s\S]*bg-table-header/);
});

test("attention risk table headers use a 12px medium label", () => {
  assert.match(
    topRisksCard,
    /data-testid="risk-list-header"[\s\S]*text-xs font-medium/,
  );
});

test("attention risk rows emphasize codes and mute risk titles", () => {
  assert.match(
    topRisksCard,
    /font-mono text-sm font-normal text-foreground/,
  );
  assert.match(
    topRisksCard,
    /min-w-0 truncate text-sm font-normal text-muted-foreground/,
  );
});

test("narrative overview is documented in both design-system surfaces", () => {
  assert.match(designSystemPage, /Narrative Overview/);
  assert.match(
    designSystemPage,
    /condition.*change.*attention.*concentrated risk.*multi-fase/is,
  );
  assert.match(designDocument, /dashboard-narrative-overview:/);
  assert.match(
    designDocument,
    /order: "kpis > trend > priorities-current-heatmap"/,
  );
  assert.match(designDocument, /header: "none; \/overview suppresses AppHeader"/);
  assert.match(
    designDocument,
    /multi-phase: "modal from the current-heatmap card bottom-center expand control"/,
  );
});
