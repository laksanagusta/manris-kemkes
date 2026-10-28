"use client";
import { useState } from "react";
import { PopoverSelectField } from "../fields/popover-select-field";
import { mitigationMonitoringStatusOptions, type MitigationMonitoringStatusFilter } from "@/lib/mitigation-monitoring-query";
import { getMonitoringStatusOptions, type MonitoringStatusFilter } from "@/lib/monitoring-overview";
import { RiskFinalizationSummary } from "../domain/risk-finalization-notice";
import { OperatorWorkSections } from "../domain/operator-work-sections";
import type { OperatorWorkItem } from "@/types/operator-work";
import type { WorkUIState } from "@/lib/operator-work";

const report:OperatorWorkItem={key:"report",kind:"mitigation_report",targetId:"report",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",mitigationAction:"Koordinasi jadwal distribusi dengan unit terkait",actionLabel:"Isi laporan",period:"2026-Q4",dueDate:"2026-10-30",responsibility:"personal",createdAt:"2026-10-01"};

export function OperatorWorkExample() {
 const [reportStatus,setReportStatus]=useState<MitigationMonitoringStatusFilter>("needs_reporting");
 const [monitorStatus,setMonitorStatus]=useState<MonitoringStatusFilter>("needs_monitoring");
 const [open,setOpen]=useState<WorkUIState["open"]>({reports:true,monitoring:true,drafts:true});
 return <section className="space-y-3"><h2 className="text-lg font-semibold">Pekerjaan saya</h2><p className="text-sm text-muted-foreground">Data ilustratif. Tiga section independen, maksimal lima pekerjaan per section, dan tenggat laporan tujuh hari. Section kosong cukup menampilkan angka 0. Jarak antar-section 12px dan padding vertikal baris 8px. Chevron mengikuti judul, divider putus-putus, dan draft dibuka melalui judul tanpa tombol tambahan. Lihat semua memakai filter bawaan tabel: Draft, Perlu dipantau, atau Perlu diisi (≤7 hari & terlambat).</p>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} onOpen={()=>{}} sections={[
   {key:"reports",total:6,items:Array.from({length:5},(_,i)=>({...report,key:`report-${i}`,dueDate:i===0?"2026-10-26":i===1?"2026-10-28":"2026-10-30"}))},
   {key:"monitoring",total:1,items:[{key:"monitor",kind:"monitoring_start",targetId:"risk",riskId:"risk",riskCode:"R-001",riskTitle:"Keterlambatan distribusi",actionLabel:"Mulai pemantauan",period:"2026-Q3",dueDate:"",responsibility:"unit",createdAt:"2026-09-01"}]},
   {key:"drafts",total:1,items:[{key:"draft",kind:"risk_draft",targetId:"draft",riskId:"draft",riskCode:"R-002",riskTitle:"Gangguan layanan",actionLabel:"Lengkapi risiko",period:"2026-Q4",dueDate:"",responsibility:"personal",createdAt:"2026-10-01"}]},
  ]}/>
  <h3 className="pt-3 text-sm font-medium">Contoh section tanpa pekerjaan</h3>
  <OperatorWorkSections today="2026-10-28" open={open} onOpenChange={(key,value)=>setOpen(current=>({...current,[key]:value}))} onOpen={()=>{}} sections={[{key:"reports",total:0,items:[]}]}/>
  <h3 className="pt-3 text-sm font-medium">Filter bawaan tabel tujuan</h3>
  <div className="flex flex-wrap items-center gap-2">
   <PopoverSelectField value={reportStatus} onValueChange={value=>setReportStatus(value as MitigationMonitoringStatusFilter)} options={mitigationMonitoringStatusOptions} placeholder="Semua status" ariaLabel="Contoh filter status penanganan" fitContent />
   <PopoverSelectField value={monitorStatus} onValueChange={value=>setMonitorStatus(value as MonitoringStatusFilter)} options={getMonitoringStatusOptions("unit")} placeholder="Semua status" ariaLabel="Contoh filter status pemantauan" fitContent />
  </div>
  <RiskFinalizationSummary next={{id:"illustrative-task",mitigationOwner:"Operator contoh",periodLabel:"2026-Q4",dueDate:"2027-01-05"}}/>
  <RiskFinalizationSummary />
 </section>;
}
