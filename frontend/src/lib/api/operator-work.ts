import { api } from "@/lib/api";
import type { OperatorWorkPage } from "@/types/operator-work";
export function listOperatorWork(token: string, page: number) {
  return api.get<OperatorWorkPage>(`/work-items?page=${page}&limit=20`, token);
}
