import { api } from "@/lib/api";
import type { OperatorWorkPage, OperatorWorkSectionKey, OperatorWorkSummary } from "@/types/operator-work";
export function listOperatorWork(token: string, page: number) {
 return api.get<OperatorWorkPage>(`/work-items?page=${page}&limit=20`, token);
}
export function getOperatorWorkSummary(token: string) {
 return api.get<OperatorWorkSummary>("/work-items?view=sections",token);
}
export function listOperatorWorkSection(token:string, section:OperatorWorkSectionKey, page:number, limit:number) {
 return api.get<OperatorWorkPage>(`/work-items?section=${section}&page=${page}&limit=${limit}`,token);
}

export async function listAllMonitoringWork(token:string) {
 const items: import("@/types/operator-work").OperatorWorkItem[]=[];
 let page=1;
 while(true) {
  const result=await listOperatorWorkSection(token,"monitoring",page,50);
  items.push(...result.items);
  if(!result.hasNext)break;
  page++;
 }
 return items;
}
