import type { OperatorWorkSectionKey } from "../types/operator-work";

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
export function sectionHref(key: OperatorWorkSectionKey) {
 return key === "drafts" ? `${workSectionPaths[key]}?status=draft` : key === "monitoring" ? `${workSectionPaths[key]}?status=in_progress` : workSectionPaths[key];
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

// A completed request may only navigate while its originating session/view is current.
export async function continueMonitoringNavigation(
 request: Promise<{monitoring:{id:string}}>,
 isCurrent: () => boolean,
 navigate: (path:string) => void,
) {
 const result=await request;
 if(isCurrent())navigate(`/risk/monitoring/${encodeURIComponent(result.monitoring.id)}?returnTo=/work`);
}
