"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ActionButton } from "../actions/action-button";
import { CollectionPageHeader } from "../layout/collection-page-header";
import { PopoverSelectField } from "../fields/popover-select-field";
import { mitigationMonitoringStatusOptions, type MitigationMonitoringStatusFilter } from "@/lib/mitigation-monitoring-query";
import { riskMonitoringStatusOptions, type RiskMonitoringStatusFilter } from "@/lib/risk-register-query";
import { RiskFinalizationSummary } from "../domain/risk-finalization-notice";
import { OperatorWorkLayout } from "../layout/operator-work-layout";
import { OperatorWorkSections } from "../domain/operator-work-sections";
import { OperatorWorkReportDialog } from "../domain/operator-work-report-dialog";
import type { MitigationTask } from "@/types/risk";
import type { MitigationReportFormValues } from "@/lib/validation/reporting";
import type { OperatorWorkItem } from "@/types/operator-work";
import type { WorkUIState } from "@/lib/operator-work";

const report:OperatorWorkItem={key:"report",kind:"mitigation_report",targetId:"report",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",mitigationAction:"Koordinasi jadwal distribusi dengan unit terkait",actionLabel:"Isi laporan",period:"2026-Q4",dueDate:"2026-10-30",responsibility:"personal",createdAt:"2026-10-01"};

const exampleReports = [
  report.mitigationAction ?? "",
  "Verifikasi daftar kontak eskalasi",
  "Catat hasil simulasi distribusi",
  "Konfirmasi kesiapan stok cadangan",
  "Evaluasi kesiapan jalur distribusi cadangan",
  "Perbarui prosedur eskalasi untuk distribusi lintas wilayah agar setiap unit mengetahui kapan harus mengaktifkan jalur cadangan dan siapa yang perlu dihubungi",
].map((mitigationAction, index) => ({
  ...report,
  key: `report-${index}`,
  targetId: `report-${index}`,
  mitigationAction,
}));

async function loadExampleReport(id: string): Promise<MitigationTask> {
  const item = exampleReports.find((entry) => entry.targetId === id);
  if (!item) throw new Error("Tugas contoh tidak ditemukan.");
  return {
    id, mitigationId: id, riskId: item.riskId, periodLabel: item.period,
    periodStart: "2026-10-01", periodEnd: "2026-10-01", dueDate: item.dueDate,
    status: "pending", actualCost: 0, evidenceUrl: "", notes: "",
    reportOutput: "", reportObstacle: "", generatedBy: "", createdAt: item.createdAt,
    updatedAt: item.createdAt, mitigationAction: item.mitigationAction,
    mitigationOwner: "Operator contoh", riskCode: item.riskCode, riskTitle: item.riskTitle,
  };
}

async function saveExampleReport(id: string, values: MitigationReportFormValues): Promise<MitigationTask> {
  const task = await loadExampleReport(id);
  return { ...task, ...values, status: "done" };
}

export function OperatorWorkExample() {
 const [reports, setReports] = useState(exampleReports);
 const [activeReport, setActiveReport] = useState<{ item: OperatorWorkItem; trigger: HTMLButtonElement } | null>(null);
 const [completingKey, setCompletingKey] = useState<string | null>(null);
 const exampleRef = useRef<HTMLParagraphElement>(null);
 const finishCompletion = useCallback(() => {
   setReports((current) => current.filter((item) => item.key !== completingKey));
   setCompletingKey(null);
 }, [completingKey]);
 const [reportStatus,setReportStatus]=useState<MitigationMonitoringStatusFilter>("needs_reporting");
 const [monitorStatus,setMonitorStatus]=useState<RiskMonitoringStatusFilter>("not_monitored");
 const [open,setOpen]=useState<WorkUIState["open"]>({reports:true,monitoring:true,drafts:true});
 return <OperatorWorkLayout header={<CollectionPageHeader title="To-Do" showTitle className="[&>div]:flex-row [&>div]:flex-wrap [&>div]:items-center [&>div>div:last-child]:ml-auto" actions={<ActionButton asChild><Link href="/risk-events?create=1">Catat kejadian</Link></ActionButton>}/>}><p id="operator-work-example" ref={exampleRef} tabIndex={-1} className="text-sm text-muted-foreground">Pilih judul laporan untuk mencoba modal dan animasi tugas selesai dengan data ilustratif.</p>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} itemHref={()=>"#operator-work-example"}
    onOpenReport={(item, trigger) => setActiveReport({ item, trigger })}
    completingKey={completingKey}
    onCompletionEnd={finishCompletion}
    sections={[
   {key:"reports",total:reports.length,items:reports.slice(0,5)},
   {key:"monitoring",total:1,items:[{key:"monitor",kind:"monitoring_start",targetId:"risk",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",actionLabel:"Mulai pemantauan",period:"2026-Q3",dueDate:"",responsibility:"unit",createdAt:"2026-09-01"}]},
   {key:"drafts",total:1,items:[{key:"draft",kind:"risk_draft",targetId:"draft",riskId:"draft",riskCode:"R-002",riskTitle:"Gangguan layanan",actionLabel:"Lengkapi risiko",period:"2026-Q4",dueDate:"",responsibility:"personal",createdAt:"2026-10-01"}]},
  ]}/>
  {activeReport && (
    <OperatorWorkReportDialog
      taskId={activeReport.item.targetId}
      loadTask={loadExampleReport}
      saveReport={saveExampleReport}
      onClosed={(saved) => {
        if (saved) {
          exampleRef.current?.focus({ preventScroll: true });
          setCompletingKey(activeReport.item.key);
        } else if (activeReport.trigger.isConnected) {
          activeReport.trigger.focus({ preventScroll: true });
        }
        setActiveReport(null);
      }}
    />
  )}
  <h3 className="pt-3 text-sm font-medium">Contoh section tanpa pekerjaan</h3>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} itemHref={()=>"#operator-work-example"} sections={[{key:"reports",total:0,items:[]}]}/>
  <h3 className="pt-3 text-sm font-medium">Pemantauan ditutup · jadwal berikutnya</h3>
  <OperatorWorkSections today="2026-11-01" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} itemHref={()=>"#operator-work-example"} sections={[{key:"monitoring",total:0,items:[]}]}/>
  <h3 className="pt-3 text-sm font-medium">Filter bawaan tabel tujuan</h3>
  <div className="flex flex-wrap items-center gap-2">
   <PopoverSelectField value={reportStatus} onValueChange={value=>setReportStatus(value as MitigationMonitoringStatusFilter)} options={mitigationMonitoringStatusOptions} placeholder="Semua status" ariaLabel="Contoh filter status penanganan" fitContent />
   <PopoverSelectField value="2026-Q3" onValueChange={()=>{}} options={[{value:"2026-Q3",label:"2026-Q3"}]} placeholder="Periode" ariaLabel="Contoh periode risiko"/><PopoverSelectField value={monitorStatus} onValueChange={value=>setMonitorStatus(value as RiskMonitoringStatusFilter)} options={riskMonitoringStatusOptions} placeholder="Semua status" ariaLabel="Contoh filter status pemantauan" fitContent />
  </div>
  <RiskFinalizationSummary cycle="2026-Q4" next={{id:"illustrative-task",mitigationOwner:"Operator contoh",periodLabel:"2026-Q4",dueDate:"2027-01-05"}}/>
  <RiskFinalizationSummary cycle="2026-Q4" />
 </OperatorWorkLayout>;
}
