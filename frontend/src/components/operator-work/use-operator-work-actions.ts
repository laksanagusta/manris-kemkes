"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { continueMonitoringNavigation } from "@/lib/operator-work";
import { startMonitoring } from "@/lib/api/risk-monitoring";
import type { OperatorWorkItem } from "@/types/operator-work";

export function useOperatorWorkActions(token: string, beforeOpen?: () => void) {
 const router = useRouter();
 const generation=useRef(0);
 const opening=useRef(false);
 useEffect(()=>{const value=++generation.current;return ()=>{generation.current=value+1;};},[token]);
 const [busyKey, setBusyKey] = useState<string | null>(null);
 const [actionError, setActionError] = useState("");
 async function open(item: OperatorWorkItem) {
  if (opening.current) return;
  beforeOpen?.();
  setActionError("");
  if (item.kind === "risk_draft") { router.push(`/risk/register/new?id=${encodeURIComponent(item.targetId)}&returnTo=/work`); return; }
  if (item.kind === "mitigation_report") { router.push(`/compliance/penanganan?taskId=${encodeURIComponent(item.targetId)}&returnTo=/work`); return; }
  if (item.kind === "monitoring_draft") { router.push(`/risk/monitoring/${encodeURIComponent(item.targetId)}?returnTo=/work`); return; }
  opening.current=true;
  const currentGeneration=generation.current;
  const isCurrent=()=>generation.current===currentGeneration;
  setBusyKey(item.key);
  try {
   await continueMonitoringNavigation(startMonitoring(token,item.riskId,item.period),isCurrent,path=>router.push(path));
  } catch (reason) {
   if(!isCurrent())return;
   opening.current=false;
   setActionError(reason instanceof Error ? reason.message : "Pemantauan belum dapat dimulai.");
   setBusyKey(null);
  }
 }
 return {open, busyKey, actionError, clearActionError: () => setActionError("")};
}
