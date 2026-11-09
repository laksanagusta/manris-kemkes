"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { QuarterlyReportExcelFormat } from "@/lib/quarterly-report-export";
import { ReportFilterPanel } from "@/components/report/report-filter-panel";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import { MonitoringOrganizationSummaryCollapsible } from "@/components/report/monitoring-organization-recap";
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
const exampleOrganizations = report.organizations.map((unit) => ({
  ...unit,
  createdAt: report.generatedAt,
}));
const exampleGroups: OrganizationGroupListItem[] = [{
  id: "example-report-group",
  name: "Direktorat program",
  description: "",
  ownerOrganizationId: "example-unit-a",
  ownerOrganizationName: "Direktorat A",
  memberCount: 2,
  members: report.organizations.slice(0, 2),
  createdAt: report.generatedAt,
  updatedAt: report.generatedAt,
}];
const exampleScope: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: report.organizations.map((unit) => unit.id),
};

export function QuarterlyReportExample() {
  const [cycle, setCycle] = useState(report.cycle);
  const [scope, setScope] = useState(exampleScope);
  const [exporting, setExporting] = useState(false);
  const selected = (organizationId: string) => !scope.organizationIds.length || scope.organizationIds.includes(organizationId);
  const scopedReport = { ...report, cycle,
    organizations: report.organizations.filter(unit => selected(unit.id)),
    risks: risks.filter(risk => selected(risk.organizationId)),
    previousRisks: report.previousRisks.filter(risk => selected(risk.organizationId)),
    tasks: report.tasks.filter(task => selected(task.organizationId)),
    events: report.events.filter(event => selected(event.organizationId)),
  };
  async function exportExcel(format: QuarterlyReportExcelFormat = "assessment") {
    if (exporting) return;
    setExporting(true);
    try {
      const { downloadQuarterlyReportExcel } = await import("@/lib/quarterly-report-export");
      await downloadQuarterlyReportExcel(scopedReport, format);
      toast.success("Contoh laporan Excel berhasil diunduh.");
    } catch {
      toast.error("Contoh laporan belum dapat diunduh.");
    } finally { setExporting(false); }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Contoh memakai komponen produksi dengan data ilustrasi. Filter mengubah periode dan cakupan contoh.
      </p>
      <ReportFilterPanel
        cycle={cycle}
        onCycleChange={setCycle}
        scope={scope}
        onScopeChange={setScope}
        organizations={exampleOrganizations}
        groups={exampleGroups}
        scopeSummary={scope.organizationIds.length
          ? `${scope.organizationIds.length} unit dipilih`
          : scope.organizationGroupId ? "Pilih minimal satu unit dari grup ini." : "Semua unit contoh"}
        scopeReady
        loading={false}
        exporting={exporting}
        canExport={!scope.organizationGroupId || scope.organizationIds.length > 0}
        onExportExcel={() => void exportExcel()}
        onExportDataExcel={() => void exportExcel("data")}
        onReload={() => toast.info("Contoh memakai data ilustrasi tetap.")}
        onReset={() => {
          setCycle(report.cycle);
          setScope(exampleScope);
        }}
      />
      <QuarterlyReportDashboard illustrative report={scopedReport} />
      <MonitoringOrganizationSummaryCollapsible cycle={cycle} loading={false} summaries={scopedReport.organizations.map(org=>({id:org.id,name:org.name,total:0,inProgress:0,finalized:0}))} />
    </div>
  );
}
