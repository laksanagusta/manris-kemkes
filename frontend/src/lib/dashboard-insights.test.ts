import assert from "node:assert/strict";
import test from "node:test";

const dashboardInsightsLib = await import(
  new URL("./dashboard-insights", import.meta.url).href,
);

const {
  buildCriticalRiskRateTrendData,
  buildExecutiveTrendData,
  buildInherentResidualTrendData,
  buildLatestOrganizationProgressData,
  buildMovementChartData,
  buildMovementSnapshotData,
  buildTopRiskBadgeMap,
  buildUnitTotalRiskScoreData,
  buildUnitExposureData,
} = dashboardInsightsLib as typeof import("./dashboard-insights");

type DashboardRiskInput = Parameters<typeof buildUnitExposureData>[0][number] & {
  status?: string;
  weight?: number;
  nilai?: number | null;
};

type LatestOrganizationProgressInput = {
  id?: string;
  org_id?: string;
  assessment_cycle?: string;
  created_at?: string;
  signatories?: Array<{ status?: string | null }>;
  risks?: Array<{
    risk?: {
      org_name?: string | null;
      status?: string | null;
    } | null;
  }>;
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
    status: "assessment_draft",
    ...overrides,
  } as Parameters<typeof buildUnitExposureData>[0][number];
}

function makeWorkingPaper(
  overrides: Partial<LatestOrganizationProgressInput> = {},
): LatestOrganizationProgressInput {
  return {
    id: "wp-1",
    org_id: "org-1",
    assessment_cycle: "2026-H1",
    created_at: "2026-02-01T00:00:00.000Z",
    signatories: [{ status: "signed" }, { status: "pending" }],
    risks: [{ risk: { org_name: "Direktorat A", status: "approved" } }],
    ...overrides,
  } as LatestOrganizationProgressInput;
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
      status: "assessment_in_review",
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
      status: "assessment_in_review",
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

test("buildUnitTotalRiskScoreData sums effective scores per unit", () => {
  const result = buildUnitTotalRiskScoreData([
    makeDashboardRisk({
      orgName: "Direktorat A",
      probability: 5,
      impact: 4,
      inherentScore: 20,
      status: "assessment_in_review",
    }),
    makeDashboardRisk({
      orgName: "Direktorat A",
      probability: 4,
      impact: 3,
      inherentScore: 12,
      status: "assessment_in_review",
    }),
    makeDashboardRisk({
      orgName: "Direktorat B",
      probability: 2,
      impact: 3,
      inherentScore: 6,
      status: "assessment_in_review",
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", totalScore: 32, riskCount: 2 },
    { orgName: "Direktorat B", totalScore: 6, riskCount: 1 },
  ]);
});

test("buildUnitTotalRiskScoreData uses effective approved score semantics", () => {
  const result = buildUnitTotalRiskScoreData([
    makeDashboardRisk({
      orgName: "Direktorat A",
      status: "approved",
      probability: 2,
      impact: 3,
      weight: 1,
      nilai: 6,
      inherentScore: 6,
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", totalScore: 6, riskCount: 1 },
  ]);
});

test("buildUnitTotalRiskScoreData falls back blank org names and sorts ties by unit name", () => {
  const result = buildUnitTotalRiskScoreData([
    makeDashboardRisk({
      orgName: "  ",
      probability: 2,
      impact: 2,
      inherentScore: 4,
    }),
    makeDashboardRisk({
      orgName: "Zulu",
      probability: 3,
      impact: 3,
      inherentScore: 9,
    }),
    makeDashboardRisk({
      orgName: "Alpha",
      probability: 3,
      impact: 3,
      inherentScore: 9,
    }),
  ]);

  assert.deepEqual(result, [
    { orgName: "Alpha", totalScore: 9, riskCount: 1 },
    { orgName: "Zulu", totalScore: 9, riskCount: 1 },
    { orgName: "Tanpa Unit", totalScore: 4, riskCount: 1 },
  ]);
});

test("buildUnitTotalRiskScoreData applies limit and returns empty-friendly array", () => {
  const limited = buildUnitTotalRiskScoreData([
    makeDashboardRisk({ orgName: "Direktorat A", inherentScore: 20 }),
    makeDashboardRisk({ orgName: "Direktorat B", inherentScore: 12 }),
  ], 1);

  assert.deepEqual(limited, [
    { orgName: "Direktorat A", totalScore: 20, riskCount: 1 },
  ]);
  assert.deepEqual(buildUnitTotalRiskScoreData([]), []);
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
      status: "assessment_in_review",
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

test("buildLatestOrganizationProgressData keeps only the newest work paper per organization", () => {
  const result = buildLatestOrganizationProgressData([
    makeWorkingPaper({
      id: "wp-a-old",
      assessment_cycle: "2025-H2",
      created_at: "2025-10-01T00:00:00.000Z",
      signatories: [{ status: "signed" }, { status: "pending" }],
      risks: [
        { risk: { org_name: "Direktorat A", status: "approved" } },
        { risk: { org_name: "Direktorat A", status: "assessment_in_review" } },
      ],
    }),
    makeWorkingPaper({
      id: "wp-a-new",
      assessment_cycle: "2026-H1",
      created_at: "2026-02-10T00:00:00.000Z",
      signatories: [
        { status: "signed" },
        { status: "signed" },
        { status: "pending" },
      ],
      risks: [
        { risk: { org_name: "Direktorat A", status: "approved" } },
        { risk: { org_name: "Direktorat A", status: "approved" } },
        { risk: { org_name: "Direktorat A", status: "assessment_in_review" } },
        { risk: { org_name: "Direktorat A", status: "assessment_draft" } },
      ],
    }),
    makeWorkingPaper({
      id: "wp-b-new",
      assessment_cycle: "2025-H2",
      created_at: "2025-11-05T00:00:00.000Z",
      signatories: [{ status: "signed" }, { status: "pending" }],
      risks: [
        { risk: { org_name: "Direktorat B", status: "approved" } },
        { risk: { org_name: "Direktorat B", status: "assessment_in_review" } },
      ],
    }),
  ]);

  assert.deepEqual(result, [
    {
      orgName: "Direktorat A",
      period: "2026-H1",
      progressCount: 2,
      totalCount: 4,
      progressPercent: 50,
    },
    {
      orgName: "Direktorat B",
      period: "2025-H2",
      progressCount: 1,
      totalCount: 2,
      progressPercent: 50,
    },
  ]);
});

test("buildLatestOrganizationProgressData keeps zero-progress newest work papers visible", () => {
  const result = buildLatestOrganizationProgressData([
    makeWorkingPaper({
      id: "wp-c-new",
      assessment_cycle: "2026-H1",
      created_at: "2026-03-03T00:00:00.000Z",
      signatories: [{ status: "pending" }, { status: "pending" }],
      risks: [{ risk: { org_name: "Direktorat C", status: "assessment_in_review" } }],
    }),
  ]);

  assert.deepEqual(result, [
    {
      orgName: "Direktorat C",
      period: "2026-H1",
      progressCount: 0,
      totalCount: 1,
      progressPercent: 0,
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
