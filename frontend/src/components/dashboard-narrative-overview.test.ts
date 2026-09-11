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
  assert.match(overviewPage, /Total Risiko/);
  assert.match(overviewPage, /Risiko Tinggi & Sangat Tinggi/);
  assert.match(overviewPage, /Penanganan Overdue/);
  assert.match(overviewPage, /Risk Exposure/);
  assert.doesNotMatch(overviewPage, /<CollectionPageHeader[\s>]/);
  assert.doesNotMatch(overviewPage, /data-dashboard-section="multi-phase"/);
  assert.match(
    appHeader,
    /pathname === "\/overview" \|\| pathname === "\/risk\/register\/new"/,
  );
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
