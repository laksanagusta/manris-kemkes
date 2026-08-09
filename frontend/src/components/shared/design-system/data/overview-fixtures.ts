import type {
  DashboardKpiTone,
  DashboardKpiTrend,
} from "../layout/dashboard-kpi-card";

export const designSystemOverviewDashboardKpis: ReadonlyArray<{
  title: string;
  value: string;
  change: string;
  trend: DashboardKpiTrend;
  tone: DashboardKpiTone;
}> = [
  { title: "Total Risiko", value: "248", change: "12%", trend: "up", tone: "neutral" },
  { title: "Risiko Tinggi", value: "36", change: "4%", trend: "down", tone: "success" },
  { title: "Overdue", value: "11", change: "2%", trend: "up", tone: "warning" },
  { title: "Risk Exposure", value: "1,284", change: "—", trend: "unavailable", tone: "neutral" },
];

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
    orgName: "Direktorat Logistik",
    score: 18,
    levelClass: "bg-risk-high/15 text-risk-high border-risk-high/20",
    href: "/risk/register/risk-example-018",
  },
  {
    id: "risk-example-024",
    code: "RISK-024",
    title: "Gangguan sistem informasi operasional",
    orgName: "Sekretariat",
    score: 20,
    levelClass: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
    href: "/risk/register/risk-example-024",
  },
  {
    id: "risk-example-031",
    code: "RISK-031",
    title: "Ketidaksesuaian dokumen kepatuhan",
    orgName: "Unit Kepatuhan",
    score: 14,
    levelClass: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
    href: "/risk/register/risk-example-031",
  },
] as const;
