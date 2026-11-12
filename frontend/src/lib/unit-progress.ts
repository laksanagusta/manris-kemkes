import type {
  UnitProgressItem,
  UnitProgressMitigation,
  UnitProgressReport,
  UnitProgressRisk,
  UnitProgressWorkingPaper,
} from "@/types/unit-progress";

export type UnitProgressGroup = {
  id: string;
  name: string;
  papers: UnitProgressWorkingPaper[];
  risks: UnitProgressRisk[];
  evaluations: UnitProgressItem[];
  mitigations: UnitProgressMitigation[];
  monitoring: { total: number; notStarted: number; drafts: number; final: number };
  riskDrafts: number;
  mitigationReported: number;
  attention: string[];
};

export function groupUnitProgress(report: UnitProgressReport): UnitProgressGroup[] {
  const units = new Map<string, UnitProgressGroup>(
    report.organizations.map(({ id, name }) => [id, {
      id, name, papers: [], risks: [], evaluations: [], mitigations: [],
      monitoring: { total: 0, notStarted: 0, drafts: 0, final: 0 },
      riskDrafts: 0, mitigationReported: 0, attention: [],
    }]),
  );

  for (const paper of report.workingPapers) units.get(paper.organizationId)?.papers.push(paper);
  for (const evaluation of report.evaluations) units.get(evaluation.organizationId)?.evaluations.push(evaluation);
  for (const task of report.mitigations) units.get(task.organizationId)?.mitigations.push(task);
  for (const risk of report.risks) {
    const unit = units.get(risk.organizationId);
    if (!unit) continue;
    unit.risks.push(risk);
    if (risk.status === "draft") {
      unit.riskDrafts++;
      continue;
    }
    unit.monitoring.total++;
    if (risk.monitoringStatus === "final") unit.monitoring.final++;
    else if (risk.monitoringStatus === "draft") unit.monitoring.drafts++;
    else unit.monitoring.notStarted++;
  }

  for (const unit of units.values()) {
    const overdue = unit.mitigations.filter((task) => task.overdue || task.status === "not_reported").length;
    const incomplete = unit.mitigations.filter((task) => task.status === "incomplete" && !task.overdue).length;
    const evaluationDrafts = unit.evaluations.filter((item) => item.status === "draft").length;
    unit.mitigationReported = unit.mitigations.filter((task) => task.status === "reported").length;
    if (overdue) unit.attention.push(`${overdue} laporan mitigasi lewat tenggat atau tidak dilaporkan`);
    if (incomplete) unit.attention.push(`${incomplete} laporan mitigasi belum lengkap`);
    if (unit.papers[0]?.status === "signing") unit.attention.push("Kertas Kerja menunggu TTE");
    if (unit.papers[0]?.status === "draft") unit.attention.push("Kertas Kerja masih draf");
    if (unit.riskDrafts) unit.attention.push(`${unit.riskDrafts} risiko masih draf`);
    if (evaluationDrafts) unit.attention.push(`${evaluationDrafts} evaluasi masih draf`);
    const monitoringPending = unit.monitoring.drafts + (report.monitoringAvailable ? unit.monitoring.notStarted : 0);
    if (monitoringPending) unit.attention.push(`${monitoringPending} pemantauan belum final`);
  }
  return Array.from(units.values());
}
