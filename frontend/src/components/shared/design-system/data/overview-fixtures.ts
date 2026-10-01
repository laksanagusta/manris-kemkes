export const designSystemOverviewDashboardKpis: ReadonlyArray<{
  title: string;
  value: string;
  detail: string;
  trend: "up" | "down";
}> = [
  { title: "Total", value: "248", detail: "risiko terdaftar", trend: "up" },
  {
    title: "Prioritas",
    value: "36",
    detail: "risiko tinggi & ekstrem",
    trend: "up",
  },
  {
    title: "Mitigasi belum terlapor",
    value: "11",
    detail: "tugas tanpa laporan",
    trend: "down",
  },
  {
    title: "Mitigasi overdue",
    value: "8",
    detail: "tugas melewati tenggat",
    trend: "up",
  },
];

export const designSystemCurrentRiskMatrix = [
  [1, 2, 0, 0, 0],
  [0, 2, 3, 1, 0],
  [0, 1, 4, 2, 1],
  [0, 0, 2, 3, 2],
  [0, 0, 1, 2, 1],
] as const;

export const designSystemOverviewCategorySegments = [
  { label: "Manusia", value: 28, color: "var(--chart-1)" },
  { label: "Metode", value: 22, color: "var(--chart-2)" },
  { label: "Mesin", value: 18, color: "var(--chart-3)" },
  { label: "Material", value: 16, color: "var(--chart-4)" },
  { label: "Lingkungan", value: 16, color: "var(--chart-5)" },
] as const;
