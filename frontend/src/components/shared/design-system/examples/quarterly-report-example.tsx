"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { QuarterlyReportExcelFormat } from "@/lib/quarterly-report-export";
import { ReportOptionsMenu } from "@/components/report/report-options-menu";
import { AnnualProfileProgressCharts } from "@/components/report/annual-profile-progress-charts";
import { ReportMonitoringRulePicker } from "@/components/report/report-monitoring-rule-picker";
import { ReportUnitScope } from "@/components/report/report-unit-scope";
import type { AnnualProfileProgressReport, MonitoringRuleProgressOption } from "@/lib/annual-profile-progress-report";
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
risks.push({ ...risks[0], id: "example-risk-c", versionGroupId: "group-c", title: "Keterlambatan tindak lanjut evaluasi", code: "OP-003", organizationId: "example-unit-b", orgName: "Direktorat B", nilai: 12, monitoringObservedNilai: 12 });
risks.push({ ...risks[0], id: "example-risk-d", versionGroupId: "group-d", title: "Kesiapan sarana pendukung", code: "OP-004", organizationId: "example-unit-b", orgName: "Direktorat B", monitoringObservedNilai: 3.6 });
const report: QuarterlyReport = {
  cycle: "2026-Q2",
  comparisonCycle: "2026-Q1",
  generatedAt: "2026-07-05T02:00:00Z",
  dataUpdatedAt: "2026-07-04T05:00:00Z",
  warnings: ["Contoh keterbatasan: sebagian profil belum memiliki hasil pemantauan final."],
  organizations: [
    { id: "example-unit-a", name: "Direktorat A" },
    { id: "example-unit-b", name: "Direktorat B" },
    { id: "example-unit-c", name: "Direktorat C" },
    ...["D", "E", "F", "G"].map(name => ({ id: `example-unit-${name.toLowerCase()}`, name: `Direktorat ${name}` })),
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
    { id: "example-task-overdue", riskId: "example-risk-c", versionGroupId: "group-c", organizationId: "example-unit-b", status: "pending", dueDate: "2026-06-15", mitigationAction: "Koordinasi tindak lanjut evaluasi", riskTitle: "Keterlambatan tindak lanjut evaluasi" } as QuarterlyTask,
  ],
  events: [
    {
      id: "example-event",
      code: "KJ-001",
      organizationId: "example-unit-a",
      organizationName: "Direktorat A",
      description: "Gangguan distribusi logistik",
      occurredAt: "2026-06-10T05:00:00Z",
      severity: "medium",
      financialLossKnown: false,
      linkedRisks: [
        { id: "example-risk-a", code: "OP-001", title: risks[0].title },
      ],
      impactTypes: ["operasional"],
      createdBy: "example",
      createdAt: "2026-06-10T05:00:00Z",
      updatedAt: "2026-06-10T05:00:00Z",
    },
  ],
};
const rules: MonitoringRuleProgressOption[] = [
  { id: "quarterly", name: "Manajemen Risiko Triwulanan", year: 2026, organizations: report.organizations.slice(0, 2) },
  { id: "earlier-quarterly", name: "Manajemen Risiko Triwulanan (arsip)", year: 2026, organizations: report.organizations.slice(1, 2) },
];

export function QuarterlyReportExample() {
  const [selected, setSelected] = useState(rules[0]);
  const [exporting, setExporting] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const unitIds = selectedUnits.length ? selectedUnits : selected.organizations.map(({ id }) => id);
  function selectRule(rule: MonitoringRuleProgressOption) {
    setSelected(rule);
    setSelectedUnits([]);
  }
  const scopedReport: QuarterlyReport = {
    ...report,
    organizations: report.organizations.filter((unit) => unitIds.includes(unit.id)),
    risks: risks.filter((risk) => unitIds.includes(risk.organizationId)),
    previousRisks: report.previousRisks.filter((risk) => unitIds.includes(risk.organizationId)),
    tasks: report.tasks.filter((task) => unitIds.includes(task.organizationId)),
    events: report.events.filter((event) => unitIds.includes(event.organizationId ?? "")),
  };
  const baseline = scopedReport.risks.map((risk) => ({
    groupId: risk.versionGroupId ?? risk.id, score: risk.nilai ?? null, weight: 1.8, target: risk.targetNilai ?? null,
  }));
  const progress: AnnualProfileProgressReport = {
    organizations: scopedReport.organizations,
    baseline,
    periods: [
      { id: "q1", label: "Triwulan I", risks: baseline.map((risk, index) => ({ ...risk, score: index === 0 ? 12 : 10, weight: 1.6 })), totalRisks: baseline.length, reportedTasks: unitIds.length, totalTasks: unitIds.length * 2 },
      { id: "q2", label: "Triwulan II", risks: baseline.map((risk, index) => ({ ...risk, score: index === 0 ? 7.2 : 11, weight: 1.5 })), totalRisks: baseline.length, reportedTasks: unitIds.length + Number(unitIds.includes("example-unit-a")), totalTasks: unitIds.length * 2 },
    ],
  };

  async function exportExcel(format: QuarterlyReportExcelFormat = "assessment") {
    setExporting(true);
    try {
      const { downloadQuarterlyReportExcel } = await import("@/lib/quarterly-report-export");
      await downloadQuarterlyReportExcel(scopedReport, format);
      toast.success("Contoh laporan Excel berhasil diunduh.");
    } catch {
      toast.error("Contoh laporan belum dapat diunduh.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border py-2">
        <span className="text-xs text-muted-foreground">Laporan Risiko</span>
        <ReportOptionsMenu
          disabled={false}
          exporting={exporting}
          canExport
          onExportExcel={() => void exportExcel()}
          onExportDataExcel={() => void exportExcel("data")}
          onReset={() => selectRule(rules[0])}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ReportMonitoringRulePicker rules={rules} selected={selected} onSelect={selectRule} disabled={exporting} />
        <ReportUnitScope organizations={selected.organizations} selectedIds={selectedUnits} onApply={setSelectedUnits} disabled={exporting} />
      </div>
      <AnnualProfileProgressCharts report={progress} />
    </div>
  );
}
