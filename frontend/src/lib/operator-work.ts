import { businessNow } from "./business-clock.ts";
import type { OperatorWorkItem, OperatorWorkSectionKey } from "../types/operator-work";

export const workSectionTitles: Record<OperatorWorkSectionKey, string> = {
 reports: "Laporan penanganan perlu diisi",
 monitoring: "Risiko perlu dipantau",
 drafts: "Risiko masih draft",
};
export const workSectionPaths: Record<OperatorWorkSectionKey, string> = {
 reports: "/compliance/penanganan",
 monitoring: "/compliance/monitoring",
 drafts: "/risk/register",
};
export function isWorkSection(value: unknown): value is OperatorWorkSectionKey {
 return value === "reports" || value === "monitoring" || value === "drafts";
}
export function sectionHref(key: OperatorWorkSectionKey, now=businessNow()) {
 if(key==="monitoring"){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"numeric"}).formatToParts(now);
  let year=Number(parts.find(p=>p.type==="year")?.value);let q=Math.floor((Number(parts.find(p=>p.type==="month")?.value)-1)/3);
  if(q===0){year--;q=4;}
  return `/risk/register?assessment_cycle=${year}-Q${q}&monitoring_status=not_monitored`;
 }
 return key==="drafts" ? "/risk/register?status=draft" : "/compliance/penanganan?status=needs_reporting";
}

export function workItemHref(item: Pick<OperatorWorkItem, "kind" | "targetId" | "riskId">) {
 const target = encodeURIComponent(item.targetId);
 switch (item.kind) {
  case "mitigation_report":
   return `/compliance/penanganan?taskId=${target}&returnTo=/work`;
  case "monitoring_draft":
   return `/risk/monitoring/${target}?returnTo=/work`;
  case "monitoring_start":
   return `/risk/register/new?id=${encodeURIComponent(item.riskId)}&tab=monitoring&returnTo=/work`;
  case "risk_draft":
   return `/risk/register/new?id=${target}&returnTo=/work`;
 }
}
export function deadlineLabel(dueDate: string, today: string) {
 if (!dueDate || !today) return "";
 const due = Date.parse(`${dueDate}T00:00:00Z`);
 const current = Date.parse(`${today}T00:00:00Z`);
 if (!Number.isFinite(due) || !Number.isFinite(current)) return "";
 const days = Math.round((due - current) / 86400000);
 return days < 0 ? `Terlambat ${-days} hari` : days === 0 ? "Jatuh tempo hari ini" : `Tersisa ${days} hari`;
}
export type WorkUIState = { open: Record<OperatorWorkSectionKey, boolean>; scrollY: number };
export function readWorkUIState(raw: string | null): WorkUIState {
 const result: WorkUIState = { open: {reports:true, monitoring:true, drafts:true}, scrollY:0 };
 try {
  const value = JSON.parse(raw || "null");
  if (!value || typeof value !== "object") return result;
  for (const key of ["reports","monitoring","drafts"] as const) {
   if (typeof value.open?.[key] === "boolean") result.open[key] = value.open[key];
  }
  if (Number.isFinite(value.scrollY) && value.scrollY >= 0) result.scrollY = value.scrollY;
 } catch { /* Unavailable/invalid session state uses defaults. */ }
 return result;
}
export function workUIKey(userID: string) { return `manris-work-ui:${userID}`; }

export function getWorkReturnLink(raw:string | null): {href:string;label:string} | null {
 if(!raw || !raw.startsWith("/") || raw.startsWith("//"))return null;
 try {
  const url=new URL(raw,"http://manris.local");
  if(url.origin!=="http://manris.local")return null;
  const label=url.pathname==="/work"?"Kembali ke pekerjaan":url.pathname==="/compliance/monitoring"?"Kembali ke pemantauan":url.pathname==="/risk/register"?"Kembali ke risiko":/^\/risk\/working-papers\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(url.pathname)?"Kembali ke Kertas Kerja":null;
  return label?{href:url.pathname+url.search,label}:null;
 } catch {return null;}
}
