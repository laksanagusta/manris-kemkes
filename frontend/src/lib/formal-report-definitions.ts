import type { FormalReportType } from "@/types/formal-report";

export type FormalReportDefinition = {
  reportType: FormalReportType;
  title: string;
  description: string;
};

export const formalReportDefinitions: FormalReportDefinition[] = [
  {
    reportType: "annual_risk_profile",
    title: "Profil Risiko Tahunan",
    description: "Ringkasan profil risiko organisasi untuk periode tahunan.",
  },
  {
    reportType: "semiannual_mr_implementation",
    title: "Laporan Penerapan MR Semesteran",
    description: "Rekap penerapan manajemen risiko pada semester berjalan.",
  },
  {
    reportType: "semiannual_mr_supervision",
    title: "Laporan Pengawasan MR Semesteran",
    description: "Ringkasan pengawasan manajemen risiko oleh fungsi pengawas.",
  },
  {
    reportType: "tmpmr_report",
    title: "Laporan TMPMR",
    description: "Output resmi penilaian maturitas manajemen risiko.",
  },
  {
    reportType: "monitoring_evaluation_report",
    title: "Laporan Monitoring & Evaluasi MR",
    description: "Laporan pemantauan dan evaluasi penerapan manajemen risiko per unit.",
  },
];

export const formalReportTypeLabels: Record<FormalReportType, string> = {
  annual_risk_profile: "Profil Risiko Tahunan",
  semiannual_mr_implementation: "Laporan Penerapan MR Semesteran",
  semiannual_mr_supervision: "Laporan Pengawasan MR Semesteran",
  tmpmr_report: "Laporan TMPMR",
  monitoring_evaluation_report: "Laporan Monitoring & Evaluasi MR",
};
