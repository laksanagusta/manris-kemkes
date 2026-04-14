import assert from "node:assert/strict";
import test from "node:test";

const dashboardInsightsLib = await import(
  new URL("./dashboard-insights.ts", import.meta.url).href,
);

const {
  buildCriticalRiskRateTrendData,
  buildExecutiveTrendData,
  buildInherentResidualTrendData,
  buildLatestOrganizationProgressData,
  buildMovementChartData,
  buildMovementSnapshotData,
  buildTopRiskBadgeMap,
  buildUnitExposureData,
} = dashboardInsightsLib as typeof import("./dashboard-insights");

type DashboardRiskInput = Parameters<typeof buildUnitExposureData>[0][number] & {
  status?: string;
  weight?: number;
  nilai?: number | null;
};

function makeDashboardRisk(
  overrides: Partial<DashboardRiskInput> = {},
): Parameters<typeof buildUnitExposureData>[0][number] {
  return {
    code: "R-001",
    orgName: "Direktorat A",
    assessmentCycle: "2026-H1",
    createdAt: "2026-02-01T00:00:00.000Z",
    probability: 5,
    impact: 4,
    weight: 1,
    nilai: 20,
    inherentScore: 20,
    status: "draft",
    ...overrides,
  } as Parameters<typeof buildUnitExposureData>[0][number];
}

test("buildUnitExposureData ranks units by weighted exposure score", () => {
  const result = buildUnitExposureData([
    { orgName: "Direktorat A", probability: 5, impact: 4, inherentScore: 20 },
    { orgName: "Direktorat A", probability: 4, impact: 3, inherentScore: 12 },
    { orgName: "Direktorat B", probability: 2, impact: 3, inherentScore: 6 },
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 7, low: 0, medium: 1, high: 0, extreme: 1 },
    { orgName: "Direktorat B", exposureScore: 1, low: 1, medium: 0, high: 0, extreme: 0 },
  ]);
});

test("buildUnitExposureData uses approved base values for current-state exposure", () => {
  const result = buildUnitExposureData([
    makeDashboardRisk({
      status: "approved",
      probability: 2,
      impact: 3,
      weight: 1,
      nilai: 6,
      inherentScore: 6,
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 1, low: 1, medium: 0, high: 0, extreme: 0 },
  ]);
});

test("buildUnitExposureData uses base values for all approved risks", () => {
  const result = buildUnitExposureData([
    makeDashboardRisk({
      status: "approved",
      probability: 5,
      impact: 4,
      weight: 1,
      nilai: 20,
      inherentScore: 20,
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 5, low: 0, medium: 0, high: 0, extreme: 1 },
  ]);
});

test("buildUnitExposureData keeps non-approved rows on inherent semantics", () => {
  const result = buildUnitExposureData([
    makeDashboardRisk({
      status: "in_approval",
      probability: 5,
      impact: 4,
      weight: 1,
      nilai: 20,
      inherentScore: 20,
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 5, low: 0, medium: 0, high: 0, extreme: 1 },
  ]);
});

test("buildUnitExposureData handles zero base values for approved risks", () => {
  const result = buildUnitExposureData([
    makeDashboardRisk({
      status: "approved",
      probability: 1,
      impact: 1,
      weight: 0,
      nilai: 0,
      inherentScore: 0,
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 0, low: 0, medium: 0, high: 0, extreme: 0 },
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
    { assessmentCycle: "2025-H2", probability: 3, impact: 4, inherentScore: 12 },
    { assessmentCycle: "2025-H2", probability: 5, impact: 4, inherentScore: 20 },
    { assessmentCycle: "2026-H1", probability: 2, impact: 2, inherentScore: 4 },
    { assessmentCycle: "2026-H1", probability: 5, impact: 4, inherentScore: 20 },
  ]);

  assert.deepEqual(result, [
    { period: "2025-H2", medium: 1, high: 0, extreme: 1, exposureScore: 7 },
    { period: "2026-H1", medium: 0, high: 0, extreme: 1, exposureScore: 5 },
  ]);
});

test("buildExecutiveTrendData uses approved base values for current-state trends", () => {
  const result = buildExecutiveTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2025-H2",
      probability: 2,
      impact: 3,
      weight: 1,
      nilai: 6,
      inherentScore: 6,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2025-H2", medium: 0, high: 0, extreme: 0, exposureScore: 1 },
  ]);
});

test("buildExecutiveTrendData uses base values for all approved risks", () => {
  const result = buildExecutiveTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2025-H2",
      probability: 5,
      impact: 4,
      weight: 1,
      nilai: 20,
      inherentScore: 20,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2025-H2", medium: 0, high: 0, extreme: 1, exposureScore: 5 },
  ]);
});

test("buildExecutiveTrendData keeps non-approved rows on inherent semantics", () => {
  const result = buildExecutiveTrendData([
    makeDashboardRisk({
      status: "in_approval",
      assessmentCycle: "2025-H2",
      probability: 5,
      impact: 4,
      weight: 1,
      nilai: 20,
      inherentScore: 20,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2025-H2", medium: 0, high: 0, extreme: 1, exposureScore: 5 },
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

test("movement helpers remain comparison-driven for all risk states", () => {
  const chart = buildMovementChartData([
    { code: "R-001", movement: "up" },
    { code: "R-002", movement: "down" },
    { code: "R-003", movement: "stable" },
  ]);

  const badges = buildTopRiskBadgeMap({
    topRisks: [{ code: "R-001" }],
    allRisks: [
      makeDashboardRisk({
        code: "R-001",
        status: "approved",
        assessmentCycle: "2026-H1",
        nextReviewDate: "2026-03-01",
      }),
    ],
    comparisons: [{ code: "R-001", movement: "up" }],
    currentCycle: "2026-H1",
    now: new Date("2026-04-02T00:00:00.000Z"),
  });

  assert.deepEqual(chart, [
    { label: "Naik", value: 1, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: 1, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: 1, fill: "oklch(0.60 0.02 265 / 55%)" },
  ]);
  assert.deepEqual(badges, {
    "R-001": ["Naik level", "Overdue"],
  });
});

test("buildUnitExposureData and buildMovementChartData return empty-friendly arrays", () => {
  assert.deepEqual(buildUnitExposureData([]), []);
  assert.deepEqual(buildMovementChartData([]), [
    { label: "Naik", value: 0, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: 0, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: 0, fill: "oklch(0.60 0.02 265 / 55%)" },
  ]);
});

test("buildExecutiveTrendData sorts semester output chronologically for overview charts", () => {
  const result = buildExecutiveTrendData([
    { assessmentCycle: "2026-H1", probability: 4, impact: 3, inherentScore: 12 },
    { assessmentCycle: "2025-H2", probability: 4, impact: 4, inherentScore: 16 },
  ]);

  assert.deepEqual(result.map((item) => item.period), ["2025-H2", "2026-H1"]);
});

test("buildCriticalRiskRateTrendData uses approved base values for current-state severity", () => {
  const result = buildCriticalRiskRateTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2026-H1",
      probability: 5,
      impact: 4,
      inherentScore: 20,
      weight: 1,
      nilai: 20,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2026-H1", highExtremeRate: 100, mediumCount: 0, highCount: 0, extremeCount: 1, totalRisks: 1 },
  ]);
});

test("buildCriticalRiskRateTrendData keeps non-approved drafts on inherent severity", () => {
  const result = buildCriticalRiskRateTrendData([
    makeDashboardRisk({
      status: "in_approval",
      assessmentCycle: "2026-H1",
      probability: 2,
      impact: 2,
      inherentScore: 4,
      weight: 1,
      nilai: 4,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2026-H1", highExtremeRate: 0, mediumCount: 0, highCount: 0, extremeCount: 0, totalRisks: 1 },
  ]);
});

test("buildInherentResidualTrendData uses approved base score instead of target score", () => {
  const result = buildInherentResidualTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2026-H1",
      inherentScore: 20,
      targetScore: 6,
      probability: 2,
      impact: 3,
      weight: 1,
      nilai: 6,
    }),
  ]);

  assert.deepEqual(result, [
    { period: "2026-H1", avgInherent: 20, avgResidual: 6, gap: 14, riskCount: 1 },
  ]);
});

test("buildInherentResidualTrendData uses base values for all approved risks", () => {
  const result = buildInherentResidualTrendData([
    makeDashboardRisk({
      status: "approved",
      assessmentCycle: "2026-H1",
      inherentScore: 20,
      targetScore: 4,
      probability: 5,
      impact: 4,
      weight: 1,
      nilai: 20,
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

test("buildMovementSnapshotData classifies new up down stable and removed risks", () => {
  const result = buildMovementSnapshotData({
    currentRisks: [
      { code: "R-001" },
      { code: "R-002" },
      { code: "R-003" },
      { code: "R-004" },
    ],
    previousRisks: [
      { code: "R-002" },
      { code: "R-003" },
      { code: "R-004" },
      { code: "R-005" },
    ],
    comparisons: [
      { code: "R-002", movement: "up" },
      { code: "R-003", movement: "down" },
      { code: "R-004", movement: "stable" },
    ],
  });

  assert.deepEqual(result, [
    { key: "new", label: "Baru", value: 1 },
    { key: "up", label: "Naik", value: 1 },
    { key: "down", label: "Turun", value: 1 },
    { key: "stable", label: "Stabil", value: 1 },
    { key: "removed", label: "Keluar", value: 1 },
  ]);
});
