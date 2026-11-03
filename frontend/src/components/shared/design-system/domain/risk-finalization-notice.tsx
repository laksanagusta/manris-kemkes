"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MitigationTask } from "@/types/risk";
import { ActionButton } from "../actions/action-button";

export function RiskFinalizationNotice({riskId,token}:{riskId:string;token:string}) {
 const [tasks,setTasks]=useState<MitigationTask[] | null>(null);
 const [error,setError]=useState(false);
 const [reload,setReload]=useState(0);
 useEffect(()=>{let cancelled=false;
  api.get<MitigationTask[]>(`/risks/${encodeURIComponent(riskId)}/tasks`,token).then(value=>{if(!cancelled){setTasks(value);setError(false);}}).catch(()=>{if(!cancelled)setError(true);});
  return()=>{cancelled=true;};
 },[riskId,token,reload]);
 const next=tasks?.filter(task=>task.status!=="skipped" && task.status!=="not_reported").sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
 return <RiskFinalizationSummary next={next} loading={tasks===null && !error} error={error} onRetry={()=>{setError(false);setReload(value=>value+1);}}/>;
}
export function RiskFinalizationSummary({next,loading,error,onRetry}:{next?:Pick<MitigationTask,"id"|"mitigationOwner"|"periodLabel"|"dueDate">;loading?:boolean;error?:boolean;onRetry?:()=>void}) {
 return <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"><div className="space-y-1"><p className="font-medium">Risiko berhasil difinalisasi.</p>
  {error ? <p className="text-muted-foreground">Jadwal penanganan belum dapat dimuat.</p> : loading ? <p className="text-muted-foreground">Memeriksa jadwal laporan…</p> : next ? <p className="text-muted-foreground">{next.mitigationOwner || "PIC belum tersedia"} · {next.periodLabel}{next.dueDate ? ` · Tenggat ${new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeZone:"Asia/Jakarta"}).format(new Date(`${next.dueDate}T12:00:00+07:00`))}` : ""}</p> : <p className="text-muted-foreground">Laporan penanganan belum tersedia.</p>}
 </div>{error ? <ActionButton onClick={onRetry}>Coba lagi</ActionButton> : next ? <ActionButton asChild><Link href={`/compliance/penanganan?taskId=${encodeURIComponent(next.id)}`}>Lihat penanganan</Link></ActionButton> : null}</div>;
}
