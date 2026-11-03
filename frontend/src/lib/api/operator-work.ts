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
