"use client";
import { useState } from "react";
import Link from "next/link";
import { ActionButton } from "../actions/action-button";
import { CollectionPageHeader } from "../layout/collection-page-header";
import { PopoverSelectField } from "../fields/popover-select-field";
import { mitigationMonitoringStatusOptions, type MitigationMonitoringStatusFilter } from "@/lib/mitigation-monitoring-query";
import { riskMonitoringStatusOptions, type RiskMonitoringStatusFilter } from "@/lib/risk-register-query";
import { RiskFinalizationSummary } from "../domain/risk-finalization-notice";
import { OperatorWorkLayout } from "../layout/operator-work-layout";
import { OperatorWorkSections } from "../domain/operator-work-sections";
import type { OperatorWorkItem } from "@/types/operator-work";
import type { WorkUIState } from "@/lib/operator-work";

const report:OperatorWorkItem={key:"report",kind:"mitigation_report",targetId:"report",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",mitigationAction:"Koordinasi jadwal distribusi dengan unit terkait",actionLabel:"Isi laporan",period:"2026-Q4",dueDate:"2026-10-30",responsibility:"personal",createdAt:"2026-10-01"};

export function OperatorWorkExample() {
 const [reportStatus,setReportStatus]=useState<MitigationMonitoringStatusFilter>("needs_reporting");
 const [monitorStatus,setMonitorStatus]=useState<RiskMonitoringStatusFilter>("not_monitored");
 const [open,setOpen]=useState<WorkUIState["open"]>({reports:true,monitoring:true,drafts:true});
 return <OperatorWorkLayout header={<CollectionPageHeader title="To-Do" showTitle className="[&>div]:flex-row [&>div]:flex-wrap [&>div]:items-center [&>div>div:last-child]:ml-auto" actions={<ActionButton asChild><Link href="/risk-events?create=1">Catat kejadian</Link></ActionButton>}/>}><p id="operator-work-example" className="text-sm text-muted-foreground">Data ilustratif dengan judul panjang, lebih dari lima tugas, dan jadwal pemantauan yang dapat membungkus pada layar sempit.</p>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} itemHref={()=>"#operator-work-example"} sections={[
   {key:"reports",total:6,items:[
    report.mitigationAction ?? "",
    "Verifikasi daftar kontak eskalasi",
    "Catat hasil simulasi distribusi",
    "Konfirmasi kesiapan stok cadangan",
    "Perbarui prosedur eskalasi untuk distribusi lintas wilayah agar setiap unit mengetahui kapan harus mengaktifkan jalur cadangan dan siapa yang perlu dihubungi",
   ].map((mitigationAction,i)=>({...report,key:`report-${i}`,mitigationAction}))},
   {key:"monitoring",total:1,items:[{key:"monitor",kind:"monitoring_start",targetId:"risk",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",actionLabel:"Mulai pemantauan",period:"2026-Q3",dueDate:"",responsibility:"unit",createdAt:"2026-09-01"}]},
   {key:"drafts",total:1,items:[{key:"draft",kind:"risk_draft",targetId:"draft",riskId:"draft",riskCode:"R-002",riskTitle:"Gangguan layanan",actionLabel:"Lengkapi risiko",period:"2026-Q4",dueDate:"",responsibility:"personal",createdAt:"2026-10-01"}]},
  ]}/>
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
