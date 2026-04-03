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

export function levelFromScore(probability?: number, impact?: number): Severity {
  const score = (probability ?? 0) * (impact ?? 0);
  if (score >= 17) return "Ekstrem";
  if (score >= 10) return "Tinggi";
  if (score >= 5) return "Sedang";
  return "Rendah";
}

export function weightFor(level: Severity) {
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

import type { DashboardRiskCategoryItem } from "@/types/risk";
import { dashboardCategoryLabels } from "@/lib/risk";

export function buildDashboardRiskCategoryData(
  items: DashboardRiskCategoryItem[]
): { label: string; count: number }[] {
  return items.map((item) => ({
    label: dashboardCategoryLabels[item.category] ?? item.category,
    count: item.count,
  }));
}
