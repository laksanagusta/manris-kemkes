// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import type { DashboardRiskCategoryItem } from "../types/risk.ts";
// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { dashboardCategoryLabels, getBobot, resolveRiskScoreSemantics } from "./risk.ts";

type Severity = "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";

type RiskLike = {
  code?: string;
  orgName?: string;
  assessmentCycle?: string;
  nextReviewDate?: string | null;
  createdAt?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number | null;
  inherentScore?: number;
  status?: "draft" | "in_review" | "in_approval" | "approved" | "rejected";
  reviewedProbability?: number | null;
  reviewedImpact?: number | null;
  reviewedWeight?: number | null;
  reviewedNilai?: number | null;
  reviewedScore?: number | null;
  targetScore?: number;
  targetProbability?: number;
  targetImpact?: number;
};

type ComparisonLike = {
  code?: string;
  orgName?: string;
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
  medium: number;
  high: number;
  extreme: number;
  exposureScore: number;
};

export type MovementSnapshotDatum = {
  key: "new" | "up" | "down" | "stable" | "removed";
  label: "Baru" | "Naik" | "Turun" | "Stabil" | "Keluar";
  value: number;
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

export function levelFromScore(inherentScore?: number): Severity {
  const score = inherentScore ?? 0;
  if (score >= 20) return "Sangat Tinggi";
  if (score >= 15) return "Tinggi";
  if (score >= 10) return "Sedang";
  if (score >= 5) return "Rendah";
  return "Sangat Rendah";
}

export function weightFor(level: Severity) {
  if (level === "Sangat Tinggi") return 5;
  if (level === "Tinggi") return 3;
  if (level === "Sedang") return 2;
  if (level === "Rendah") return 1;
  return 0;
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
    const level = levelFromScore(
      resolveRiskScoreSemantics({
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
      }).effective.score,
    );
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
    if (level === "Sangat Tinggi") row.extreme += 1;
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

/* ───────────────── Movement By Organization ───────────────── */

export type MovementByOrgDatum = {
  orgName: string;
  naik: number;
  turun: number;
  stabil: number;
  total: number;
};

export type MovementByOrgSortKey = "total" | "naik" | "turun" | "stabil" | "orgName";

export function buildMovementByOrgData(
  comparisons: ComparisonLike[],
  sortBy: MovementByOrgSortKey = "total",
): MovementByOrgDatum[] {
  const grouped = new Map<string, MovementByOrgDatum>();

  for (const item of comparisons) {
    const orgName = item.orgName?.trim() || "Tanpa Unit";
    const row = grouped.get(orgName) ?? { orgName, naik: 0, turun: 0, stabil: 0, total: 0 };

    if (item.movement === "up") row.naik += 1;
    else if (item.movement === "down") row.turun += 1;
    else row.stabil += 1;

    row.total += 1;
    grouped.set(orgName, row);
  }

  const result = [...grouped.values()];

  switch (sortBy) {
    case "naik":
      result.sort((a, b) => b.naik - a.naik || b.total - a.total || a.orgName.localeCompare(b.orgName));
      break;
    case "turun":
      result.sort((a, b) => b.turun - a.turun || b.total - a.total || a.orgName.localeCompare(b.orgName));
      break;
    case "stabil":
      result.sort((a, b) => b.stabil - a.stabil || b.total - a.total || a.orgName.localeCompare(b.orgName));
      break;
    case "orgName":
      result.sort((a, b) => a.orgName.localeCompare(b.orgName));
      break;
    default:
      result.sort((a, b) => b.total - a.total || b.naik - a.naik || a.orgName.localeCompare(b.orgName));
  }

  return result;
}

export function buildExecutiveTrendData(risks: RiskLike[]): ExecutiveTrendDatum[] {
  const grouped = new Map<string, ExecutiveTrendDatum>();

  for (const risk of risks) {
    const period = normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
    if (!period) continue;

    const level = levelFromScore(
      resolveRiskScoreSemantics({
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
      }).effective.score,
    );
    const row = grouped.get(period) ?? { period, medium: 0, high: 0, extreme: 0, exposureScore: 0 };
    if (level === "Sedang") row.medium += 1;
    if (level === "Tinggi") row.high += 1;
    if (level === "Sangat Tinggi") row.extreme += 1;
    row.exposureScore += weightFor(level);
    grouped.set(period, row);
  }

  return [...grouped.values()].sort((left, right) => semesterSortValue(left.period) - semesterSortValue(right.period));
}

export function buildMovementSnapshotData(input: {
  currentRisks: Array<Pick<RiskLike, "code">>;
  previousRisks: Array<Pick<RiskLike, "code">>;
  comparisons: ComparisonLike[];
}): MovementSnapshotDatum[] {
  const currentCodes = new Set(input.currentRisks.map((risk) => risk.code).filter(Boolean));
  const previousCodes = new Set(input.previousRisks.map((risk) => risk.code).filter(Boolean));
  const counts = { new: 0, up: 0, down: 0, stable: 0, removed: 0 };

  for (const code of currentCodes) {
    if (!previousCodes.has(code)) counts.new += 1;
  }

  for (const item of input.comparisons) {
    if (item.movement === "up") counts.up += 1;
    else if (item.movement === "down") counts.down += 1;
    else counts.stable += 1;
  }

  for (const code of previousCodes) {
    if (!currentCodes.has(code)) counts.removed += 1;
  }

  return [
    { key: "new", label: "Baru", value: counts.new },
    { key: "up", label: "Naik", value: counts.up },
    { key: "down", label: "Turun", value: counts.down },
    { key: "stable", label: "Stabil", value: counts.stable },
    { key: "removed", label: "Keluar", value: counts.removed },
  ];
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

export function buildDashboardRiskCategoryData(
  items: DashboardRiskCategoryItem[]
): { label: string; count: number }[] {
  return items.map((item) => ({
    label: dashboardCategoryLabels[item.category] ?? item.category,
    count: item.count,
  }));
}

/* ───────────────────── Latest Organization Progress ───────────────────── */

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

/* ───────────────────── Inherent vs Residual Trend ───────────────────── */

export type InherentResidualDatum = {
  period: string;
  avgInherent: number;
  avgResidual: number;
  gap: number;
  riskCount: number;
};

export function buildInherentResidualTrendData(risks: RiskLike[]): InherentResidualDatum[] {
  const grouped = new Map<string, { inherentSum: number; residualSum: number; count: number }>();

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

/* ───────────────────── Critical Risk Rate Trend ───────────────────── */

export type CriticalRiskRateDatum = {
  period: string;
  highExtremeRate: number;
  mediumCount: number;
  highCount: number;
  extremeCount: number;
  totalRisks: number;
};

export function buildCriticalRiskRateTrendData(risks: RiskLike[]): CriticalRiskRateDatum[] {
  const grouped = new Map<string, { medium: number; high: number; extreme: number; total: number }>();

  for (const risk of risks) {
    const period = normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
    if (!period) continue;

    const level = levelFromScore(
      resolveRiskScoreSemantics({
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
      }).effective.score,
    );
    const bucket = grouped.get(period) ?? { medium: 0, high: 0, extreme: 0, total: 0 };
    if (level === "Sedang") bucket.medium += 1;
    if (level === "Tinggi") bucket.high += 1;
    if (level === "Sangat Tinggi") bucket.extreme += 1;
    bucket.total += 1;
    grouped.set(period, bucket);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => semesterSortValue(a) - semesterSortValue(b))
    .map(([period, bucket]) => ({
      period,
      highExtremeRate: bucket.total > 0 ? Math.round(((bucket.medium + bucket.high + bucket.extreme) / bucket.total) * 100) : 0,
      mediumCount: bucket.medium,
      highCount: bucket.high,
      extremeCount: bucket.extreme,
      totalRisks: bucket.total,
    }));
}
