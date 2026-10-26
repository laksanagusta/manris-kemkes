"use client";
import { RiskFinalizationSummary } from "../domain/risk-finalization-notice";
import { OperatorWorkList } from "../domain/operator-work-list";
export function OperatorWorkExample() {
  return <section className="space-y-3"><h2 className="text-lg font-semibold">Pekerjaan saya</h2><p className="text-sm text-muted-foreground">Data ilustratif. Satu daftar, satu tindakan per pekerjaan, dengan tanggung jawab dan tenggat yang jelas.</p>
    <OperatorWorkList today="2026-10-26" onOpen={() => {}} items={[
      {key:"report",kind:"mitigation_report",targetId:"report",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",actionLabel:"Isi laporan",period:"2026-Q3",dueDate:"2026-10-05",responsibility:"personal",createdAt:"2026-10-01"},
      {key:"monitor",kind:"monitoring_start",targetId:"risk",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",actionLabel:"Mulai pemantauan",period:"2026-Q3",dueDate:"",responsibility:"unit",createdAt:"2026-09-01"},
      {key:"draft",kind:"risk_draft",targetId:"draft",riskId:"draft",riskCode:"R-002",riskTitle:"Gangguan layanan",actionLabel:"Lengkapi risiko",period:"2026-Q4",dueDate:"",responsibility:"personal",createdAt:"2026-10-01"},
    ]}/>
    <RiskFinalizationSummary next={{id:"illustrative-task",mitigationOwner:"Operator contoh",periodLabel:"2026-Q4",dueDate:"2027-01-05"}}/>
    <RiskFinalizationSummary />
  </section>;
}
