import { RISK_CHART_COLORS } from "@/lib/chart-colors";
import { dashboardCategoryLabels, riskCategoryColors } from "@/lib/risk";

type CategoryKey = keyof typeof riskCategoryColors;

export const levels = [
  { label: "Sangat rendah", color: RISK_CHART_COLORS.veryLow },
  { label: "Rendah", color: RISK_CHART_COLORS.low },
  { label: "Sedang", color: RISK_CHART_COLORS.medium },
  { label: "Tinggi", color: RISK_CHART_COLORS.high },
  { label: "Sangat tinggi", color: RISK_CHART_COLORS.extreme },
] as const;

const groups = [
  { key: "operasional", counts: [2, 4, 5, 5, 2] },
  { key: "kepatuhan", counts: [1, 2, 4, 2, 1] },
  { key: "fraud_korupsi", counts: [0, 1, 2, 2, 2] },
  { key: "kebijakan", counts: [1, 2, 1, 1, 0] },
  { key: "reputasi", counts: [0, 1, 2, 1, 0] },
  { key: "legal", counts: [0, 1, 1, 0, 0] },
] satisfies { key: CategoryKey; counts: number[] }[];

export const categories = groups.map(({ key, counts }) => ({
  key,
  label: dashboardCategoryLabels[key],
  color: riskCategoryColors[key],
  counts,
  total: counts.reduce((sum, count) => sum + count, 0),
}));

export type Category = (typeof categories)[number];
export const totalRisks = categories.reduce((sum, category) => sum + category.total, 0);
export const currentCycle = "2027-Q2";

const percent = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatShare(count: number) {
  return percent.format(count / totalRisks);
}

export const snapshots = [
  { period: "2026-Q3", total: 31 },
  { period: "2026-Q4", total: 36 },
  { period: "2027-Q1", total: 42 },
  { period: currentCycle, total: totalRisks },
].flatMap(({ period, total }) =>
  Array.from({ length: total }, (_, index) => ({
    id: `${period}-${index}`,
    assessmentCycle: period,
  })),
);
