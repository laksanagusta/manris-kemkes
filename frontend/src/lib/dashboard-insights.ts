// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import type { DashboardRiskCategoryItem } from "../types/risk";
// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { dashboardCategoryLabels, getBobot, resolveRiskScoreSemantics } from "./risk.js";

type Severity = "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";

type RiskLike = {
  id?: string;
  code?: string;
  versionGroupId?: string;
  versionNumber?: number;
  orgName?: string;
  assessmentCycle?: string;
  nextReviewDate?: string | null;
  createdAt?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number | null;
  inherentScore?: number;
  status?: "assessment_draft" | "assessment_in_review" | "approved";
  targetScore?: number;
  targetNilai?: number | null;
  targetProbability?: number;
  targetImpact?: number;
};

type ComparisonLike = {
  code?: string;
  orgName?: string;
  movement?: string;
};

type WorkingPaperLike = {
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

export type UnitExposureDatum = {
  orgName: string;
  exposureScore: number;
  low: number;
  medium: number;
  high: number;
  extreme: number;
};

export type UnitTotalRiskScoreDatum = {
  orgName: string;
  totalScore: number;
  riskCount: number;
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

export type SemesterScoreTargetDatum = {
  period: string;
  actualScore: number;
  targetScore: number | null;
  gap: number | null;
  riskCount: number;
  targetCount: number;
};

function normalizeSemesterKey(value?: string) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(H[12]|Q[1-4])$/i);
  if (!match) return null;
  const year = match[1];
  const suffix = match[2].toUpperCase();
  if (suffix.startsWith("H")) {
    return `${year}-${suffix}`;
  }
  const quarter = Number(suffix.slice(1));
  return `${year}-${quarter <= 2 ? "H1" : "H2"}`;
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
         status: risk.status ?? "assessment_draft",
         probability: risk.probability ?? 1,
         impact: risk.impact ?? 1,
         weight: risk.weight ?? getBobot(risk.probability ?? 1, risk.impact ?? 1),
         nilai: risk.nilai ?? undefined,
         inherentScore: risk.inherentScore ?? 0,
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

export function buildUnitTotalRiskScoreData(
  risks: RiskLike[],
  limit?: number,
): UnitTotalRiskScoreDatum[] {
  const grouped = new Map<string, UnitTotalRiskScoreDatum>();

  for (const risk of risks) {
    const orgName = risk.orgName?.trim() || "Tanpa Unit";
    const effectiveScore = resolveRiskScoreSemantics({
      status: risk.status ?? "assessment_draft",
      probability: risk.probability ?? 1,
      impact: risk.impact ?? 1,
      weight: risk.weight ?? getBobot(risk.probability ?? 1, risk.impact ?? 1),
      nilai: risk.nilai ?? undefined,
      inherentScore: risk.inherentScore ?? 0,
    }).effective.score;

    const row = grouped.get(orgName) ?? {
      orgName,
      totalScore: 0,
      riskCount: 0,
    };

    row.totalScore += effectiveScore;
    row.riskCount += 1;
    grouped.set(orgName, row);
  }

  const result = [...grouped.values()].sort(
    (left, right) =>
      right.totalScore - left.totalScore ||
      right.riskCount - left.riskCount ||
      left.orgName.localeCompare(right.orgName),
  );

  return typeof limit === "number" ? result.slice(0, limit) : result;
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
         status: risk.status ?? "assessment_draft",
         probability: risk.probability ?? 1,
         impact: risk.impact ?? 1,
         weight: risk.weight ?? getBobot(risk.probability ?? 1, risk.impact ?? 1),
         nilai: risk.nilai ?? undefined,
         inherentScore: risk.inherentScore ?? 0,
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
): {
  label: string;
  count: number;
  sangatRendah: number;
  rendah: number;
  sedang: number;
  tinggi: number;
  ekstrem: number;
}[] {
  return items.map((item) => ({
    label: dashboardCategoryLabels[item.category] ?? item.category,
    count: item.count,
    sangatRendah: item.sangatRendah,
    rendah: item.rendah,
    sedang: item.sedang,
    tinggi: item.tinggi,
    ekstrem: item.ekstrem,
  }));
}

/* ───────────────────── Latest Organization Progress ───────────────────── */

export type LatestOrganizationProgressDatum = {
  orgName: string;
  period: string;
  progressCount: number;
  totalCount: number;
  progressPercent: number;
};

function resolveWorkingPaperPeriod(
  workingPaper: Pick<WorkingPaperLike, "assessment_cycle" | "created_at">,
) {
  return (
    normalizeSemesterKey(workingPaper.assessment_cycle) ||
    deriveSemester(workingPaper.created_at)
  );
}

export function buildLatestOrganizationProgressData(
  workingPapers: WorkingPaperLike[],
): LatestOrganizationProgressDatum[] {
  const grouped = new Map<
    string,
    { period: string; sortValue: number; progressCount: number; totalCount: number }
  >();

  for (const workingPaper of workingPapers) {
    const orgName =
      workingPaper.risks
        ?.map((item) => item.risk?.org_name?.trim())
        .find(Boolean) ||
      workingPaper.org_id?.trim() ||
      "Tanpa Unit";
    const period = resolveWorkingPaperPeriod(workingPaper);
    if (!period) continue;

    const createdAt = new Date(workingPaper.created_at ?? "").getTime();
    const sortValue = Number.isNaN(createdAt)
      ? semesterSortValue(period)
      : createdAt;
    const linkedRisks = workingPaper.risks ?? [];
    const progressCount = linkedRisks.filter(
      (linkedRisk) => linkedRisk.risk?.status === "approved",
    ).length;

    const existing = grouped.get(orgName);
    if (existing && sortValue <= existing.sortValue) continue;

    grouped.set(orgName, {
      period,
      sortValue,
      progressCount,
      totalCount: linkedRisks.length,
    });
  }

  return [...grouped.entries()]
    .map(([orgName, bucket]) => ({
      orgName,
      period: bucket.period,
      progressCount: bucket.progressCount,
      totalCount: bucket.totalCount,
      progressPercent:
        bucket.totalCount === 0
          ? 0
          : Math.round((bucket.progressCount / bucket.totalCount) * 1000) / 10,
    }))
    .sort(
      (left, right) =>
        right.progressPercent - left.progressPercent ||
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
  const grouped = new Map<string, { totalInherent: number; totalResidual: number; riskCount: number }>();

  for (const risk of risks) {
    const period = normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
    if (!period) continue;

    const probability = risk.probability ?? 1;
    const impact = risk.impact ?? 1;
    const weight = risk.weight ?? getBobot(probability, impact);
    const residualNilai = typeof risk.nilai === "number"
      ? risk.nilai
      : probability * impact * weight;
    const inherentScore = risk.inherentScore ?? Math.round(residualNilai);
    const residualScore = Math.round(residualNilai);

    const bucket = grouped.get(period) ?? {
      totalInherent: 0,
      totalResidual: 0,
      riskCount: 0,
    };

    bucket.totalInherent += inherentScore;
    bucket.totalResidual += residualScore;
    bucket.riskCount += 1;
    grouped.set(period, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => semesterSortValue(left) - semesterSortValue(right))
    .map(([period, bucket]) => {
      const avgInherent = Math.round((bucket.totalInherent / bucket.riskCount) * 10) / 10;
      const avgResidual = Math.round((bucket.totalResidual / bucket.riskCount) * 10) / 10;
      return {
        period,
        avgInherent,
        avgResidual,
        gap: Math.round((avgInherent - avgResidual) * 10) / 10,
        riskCount: bucket.riskCount,
      };
    });
}

function compareRiskVersion(left: RiskLike, right: RiskLike) {
  const leftTime = new Date(left.createdAt ?? "").getTime();
  const rightTime = new Date(right.createdAt ?? "").getTime();

  const leftHasTime = !Number.isNaN(leftTime);
  const rightHasTime = !Number.isNaN(rightTime);
  if (leftHasTime && rightHasTime && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (leftHasTime !== rightHasTime) {
    return leftHasTime ? 1 : -1;
  }

  const leftVersion = left.versionNumber ?? 0;
  const rightVersion = right.versionNumber ?? 0;
  if (leftVersion !== rightVersion) return leftVersion - rightVersion;

  const leftId = left.id ?? left.code ?? left.versionGroupId ?? "";
  const rightId = right.id ?? right.code ?? right.versionGroupId ?? "";
  return leftId.localeCompare(rightId);
}

function riskGroupingKey(risk: RiskLike) {
  return (
    risk.versionGroupId?.trim() ||
    risk.code?.trim() ||
    risk.id?.trim() ||
    ""
  );
}

function readActualScore(risk: RiskLike) {
  if (typeof risk.inherentScore === "number") return risk.inherentScore;
  if (typeof risk.nilai === "number") return Math.round(risk.nilai);
  return 0;
}

function readTargetScore(risk: RiskLike) {
  if (typeof risk.targetScore === "number" && risk.targetScore > 0) {
    return risk.targetScore;
  }
  if (typeof risk.targetNilai === "number" && risk.targetNilai > 0) {
    return Math.round(risk.targetNilai);
  }
  return null;
}

export function buildSemesterScoreTargetTrendData(
  risks: RiskLike[],
): SemesterScoreTargetDatum[] {
  const groupedByPeriod = new Map<string, Map<string, RiskLike>>();

  for (const risk of risks) {
    const period = normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
    if (!period) continue;

    const key = riskGroupingKey(risk);
    if (!key) continue;

    const periodBucket = groupedByPeriod.get(period) ?? new Map<string, RiskLike>();
    const existing = periodBucket.get(key);
    if (!existing || compareRiskVersion(existing, risk) < 0) {
      periodBucket.set(key, risk);
    }
    groupedByPeriod.set(period, periodBucket);
  }

  return [...groupedByPeriod.entries()]
    .sort(([left], [right]) => semesterSortValue(left) - semesterSortValue(right))
    .map(([period, bucket]) => {
      let actualTotal = 0;
      let targetTotal = 0;
      let riskCount = 0;
      let targetCount = 0;

      for (const risk of bucket.values()) {
        riskCount += 1;
        actualTotal += readActualScore(risk);

        const targetScore = readTargetScore(risk);
        if (targetScore !== null) {
          targetTotal += targetScore;
          targetCount += 1;
        }
      }

      const actualScore = riskCount === 0 ? 0 : Math.round((actualTotal / riskCount) * 10) / 10;
      const targetScore = targetCount === 0 ? null : Math.round((targetTotal / targetCount) * 10) / 10;

      return {
        period,
        actualScore,
        targetScore,
        gap: targetScore === null ? null : Math.round((actualScore - targetScore) * 10) / 10,
        riskCount,
        targetCount,
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
         status: risk.status ?? "assessment_draft",
         probability: risk.probability ?? 1,
         impact: risk.impact ?? 1,
         weight: risk.weight ?? getBobot(risk.probability ?? 1, risk.impact ?? 1),
         nilai: risk.nilai ?? undefined,
         inherentScore: risk.inherentScore ?? 0,
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
