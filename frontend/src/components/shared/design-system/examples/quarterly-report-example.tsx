"use client";

import { QuarterlyReportDashboard } from "@/components/report/quarterly-report-dashboard";
import type {
  QuarterlyReport,
  QuarterlyRisk,
  QuarterlyTask,
} from "@/types/quarterly-report";

const risks: QuarterlyRisk[] = [
  {
    id: "example-risk-a",
    versionGroupId: "group-a",
    title: "Keterlambatan distribusi logistik",
    code: "OP-001",
    organizationId: "example-unit-a",
    orgName: "Direktorat A",
    nilai: 16,
    targetProbability: 2,
    targetImpact: 2,
    targetWeight: 1.8,
    targetNilai: 7.2,
    monitoringStatus: "final",
    monitoringAssessmentCycle: "2026-Q2",
    monitoringObservedNilai: 7.2,
  },
  {
    id: "example-risk-b",
    versionGroupId: "group-b",
    title: "Kelengkapan data pelaporan program",
    code: "OP-002",
    organizationId: "example-unit-a",
    orgName: "Direktorat A",
    nilai: 10,
    targetProbability: 1,
    targetImpact: 2,
    targetWeight: 1.5,
    targetNilai: 3,
    archivedInPeriod: true,
  },
];
const report: QuarterlyReport = {
  cycle: "2026-Q2",
  comparisonCycle: "2026-Q1",
  generatedAt: "2026-07-05T02:00:00Z",
  dataUpdatedAt: "2026-07-04T05:00:00Z",
  warnings: [],
  organizations: [
    { id: "example-unit-a", name: "Direktorat A" },
    { id: "example-unit-b", name: "Direktorat B" },
  ],
  risks,
  previousRisks: [
    {
      ...risks[0],
      nilai: 12,
      monitoringAssessmentCycle: "2026-Q1",
      monitoringObservedNilai: 10,
    },
  ],
  tasks: [
    {
      id: "example-task-a",
      riskId: "example-risk-a",
      versionGroupId: "group-a",
      organizationId: "example-unit-a",
      status: "done",
      dueDate: "2026-06-20",
      notes: "Koordinasi distribusi telah dilaporkan.",
      reportedAt: "2026-06-18T05:00:00Z",
      mitigationAction: "Koordinasi distribusi lintas unit",
      mitigationOwner: "Tim logistik",
      riskTitle: risks[0].title,
      riskCode: "OP-001",
      evidenceUrl: "https://example.com/bukti",
    } as QuarterlyTask,
  ],
  events: [
    {
      id: "example-event",
      code: "KJ-001",
      organizationId: "example-unit-a",
      organizationName: "Direktorat A",
      description: "Gangguan distribusi logistik",
      actualImpact: "Distribusi tertunda satu hari",
      occurredAt: "2026-06-10T05:00:00Z",
      severity: "medium",
      postResponseCondition: "controlled",
      financialLossKnown: false,
      linkedRisks: [
        { id: "example-risk-a", code: "OP-001", title: risks[0].title },
      ],
      impactTypes: ["operasional"],
      immediateResponse: "Penjadwalan ulang",
      createdBy: "example",
      createdAt: "2026-06-10T05:00:00Z",
      updatedAt: "2026-06-10T05:00:00Z",
    },
  ],
};
export function QuarterlyReportExample() {
  return <QuarterlyReportDashboard report={report} />;
}
