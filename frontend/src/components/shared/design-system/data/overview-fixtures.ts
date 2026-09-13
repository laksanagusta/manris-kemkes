export const designSystemOverviewDashboardKpis: ReadonlyArray<{
  title: string;
  value: string;
}> = [
  { title: "Total", value: "248" },
  {
    title: "Prioritas",
    value: "36",
  },
  { title: "Mitigasi belum terlapor", value: "11" },
  {
    title: "Eksposur",
    value: "1,284",
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

export const designSystemOverviewTopRisks = [
  {
    id: "risk-example-018",
    code: "RISK-018",
    title: "Keterlambatan pengadaan bahan baku utama",
    category: "operasional",
    score: 18,
    levelClass: "bg-risk-high/15 text-risk-high border-risk-high/20",
    href: "/risk/register/risk-example-018",
  },
  {
    id: "risk-example-024",
    code: "RISK-024",
    title: "Gangguan sistem informasi operasional",
    category: "kebijakan",
    score: 20,
    levelClass: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
    href: "/risk/register/risk-example-024",
  },
  {
    id: "risk-example-031",
    code: "RISK-031",
    title: "Ketidaksesuaian dokumen kepatuhan",
    category: "kepatuhan",
    score: 14,
    levelClass: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
    href: "/risk/register/risk-example-031",
  },
] as const;
