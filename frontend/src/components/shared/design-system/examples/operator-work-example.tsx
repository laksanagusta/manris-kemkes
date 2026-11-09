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
 return <OperatorWorkLayout header={<CollectionPageHeader title="To-Do" showTitle className="[&>div]:flex-row [&>div]:flex-wrap [&>div]:items-center [&>div>div:last-child]:ml-auto" actions={<ActionButton asChild><Link href="/risk-events?create=1">Catat kejadian</Link></ActionButton>}/>}><p className="text-sm text-muted-foreground">Data ilustratif. Pekerjaan saya memakai satu Card dengan tiga kelompok yang dapat dibuka secara independen. Judul kelompok dan jumlah tampil bersebelahan. Ikon jenis pekerjaan mengawali baris, garis tipis memisahkan baris, dan tenggat terlambat memakai teks merah serta keterangan. Judul, konteks risiko, tenggat, dan aksi sejajar dalam kolom saat ruang cukup, lalu bertumpuk pada layar sempit. Setiap kelompok menampilkan hingga lima tugas dan menyediakan Lihat semua bila ada tugas lain. Banner periode pemantauan berada di atas Card.</p>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} onOpen={()=>{}} sections={[
   {key:"reports",total:6,items:Array.from({length:5},(_,i)=>({...report,key:`report-${i}`,dueDate:i===0?"2026-10-26":i===1?"2026-10-28":"2026-10-30"}))},
   {key:"monitoring",total:1,items:[{key:"monitor",kind:"monitoring_start",targetId:"risk",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",actionLabel:"Mulai pemantauan",period:"2026-Q3",dueDate:"",responsibility:"unit",createdAt:"2026-09-01"}]},
   {key:"drafts",total:1,items:[{key:"draft",kind:"risk_draft",targetId:"draft",riskId:"draft",riskCode:"R-002",riskTitle:"Gangguan layanan",actionLabel:"Lengkapi risiko",period:"2026-Q4",dueDate:"",responsibility:"personal",createdAt:"2026-10-01"}]},
  ]}/>
  <h3 className="pt-3 text-sm font-medium">Contoh section tanpa pekerjaan</h3>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} onOpen={()=>{}} sections={[{key:"reports",total:0,items:[]}]}/>
  <h3 className="pt-3 text-sm font-medium">Pemantauan ditutup · jadwal berikutnya</h3>
  <OperatorWorkSections today="2026-11-01" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} onOpen={()=>{}} sections={[{key:"monitoring",total:0,items:[]}]}/>
  <h3 className="pt-3 text-sm font-medium">Filter bawaan tabel tujuan</h3>
  <div className="flex flex-wrap items-center gap-2">
   <PopoverSelectField value={reportStatus} onValueChange={value=>setReportStatus(value as MitigationMonitoringStatusFilter)} options={mitigationMonitoringStatusOptions} placeholder="Semua status" ariaLabel="Contoh filter status penanganan" fitContent />
   <PopoverSelectField value="2026-Q3" onValueChange={()=>{}} options={[{value:"2026-Q3",label:"2026-Q3"}]} placeholder="Periode" ariaLabel="Contoh periode risiko"/><PopoverSelectField value={monitorStatus} onValueChange={value=>setMonitorStatus(value as RiskMonitoringStatusFilter)} options={riskMonitoringStatusOptions} placeholder="Semua status" ariaLabel="Contoh filter status pemantauan" fitContent />
  </div>
  <RiskFinalizationSummary cycle="2026-Q4" next={{id:"illustrative-task",mitigationOwner:"Operator contoh",periodLabel:"2026-Q4",dueDate:"2027-01-05"}}/>
  <RiskFinalizationSummary cycle="2026-Q4" />
 </OperatorWorkLayout>;
}
