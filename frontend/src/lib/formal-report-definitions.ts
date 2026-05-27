import type { FormalReportType } from "@/types/formal-report";

export type FormalReportDefinition = {
  reportType: FormalReportType;
  title: string;
  description: string;
};

export const formalReportDefinitions: FormalReportDefinition[] = [
  {
    reportType: "monitoring_evaluation_report",
    title: "Laporan Monitoring & Evaluasi",
    description:
      "Laporan pemantauan dan evaluasi penerapan manajemen risiko per unit.",
  },
];

export const formalReportTypeLabels: Record<FormalReportType, string> = {
  monitoring_evaluation_report: "Laporan Monitoring & Evaluasi",
};
