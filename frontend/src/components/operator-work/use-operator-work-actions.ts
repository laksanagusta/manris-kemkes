"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { continueMonitoringNavigation } from "@/lib/operator-work";
import { startMonitoring } from "@/lib/api/risk-monitoring";
import type { OperatorWorkItem } from "@/types/operator-work";

export function useOperatorWorkActions(token: string, beforeOpen?: () => void, returnTo = "/work") {
 const router = useRouter();
 const generation=useRef(0);
 const opening=useRef(false);
 useEffect(()=>{const value=++generation.current;return ()=>{generation.current=value+1;opening.current=false;};},[token,returnTo]);
 const [pending,setPending]=useState<{key:string;token:string;returnTo:string}|null>(null);
 const busyKey=pending?.token===token && pending.returnTo===returnTo ? pending.key : null;
 const [actionError, setActionError] = useState("");
 async function open(item: OperatorWorkItem) {
  if (opening.current) return;
  beforeOpen?.();
  setActionError("");
  if (item.kind === "risk_draft") { router.push(`/risk/register/new?id=${encodeURIComponent(item.targetId)}&returnTo=/work`); return; }
  if (item.kind === "mitigation_report") { router.push(`/compliance/penanganan?taskId=${encodeURIComponent(item.targetId)}&returnTo=/work`); return; }
  if (item.kind === "monitoring_draft") { router.push(`/risk/monitoring/${encodeURIComponent(item.targetId)}?returnTo=${encodeURIComponent(returnTo)}`); return; }
  opening.current=true;
  const currentGeneration=generation.current;
  const isCurrent=()=>generation.current===currentGeneration;
  setPending({key:item.key,token,returnTo});
  try {
   await continueMonitoringNavigation(startMonitoring(token,item.riskId,item.period),isCurrent,path=>router.push(path),returnTo);
  } catch (reason) {
   if(!isCurrent())return;
   opening.current=false;
   setActionError(reason instanceof Error ? reason.message : "Pemantauan belum dapat dimulai.");
   setPending(null);
  }
 }
 return {open, busyKey, actionError, clearActionError: () => setActionError("")};
}
