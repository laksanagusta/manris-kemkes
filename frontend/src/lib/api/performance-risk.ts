import { api } from "@/lib/api";
import type {
  PerformanceRiskDetail,
  PerformanceRiskNode,
  PerformanceRiskQuery,
  PerformanceRiskRiskRow,
  PerformanceRiskSummary,
} from "@/types/performance-risk";

export function buildPerformanceRiskQuery(params: PerformanceRiskQuery) {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set("period", params.period);
  if (params.planningId) searchParams.set("planning_id", params.planningId);
  if (params.orgId) {
    searchParams.set("org_id", params.orgId);
  }
  return searchParams.toString();
}

export async function getPerformanceRiskSummary(
  token: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskSummary> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskSummary>(`/reports/performance-risk/summary?${qs}`, token);
}

export async function listPerformanceRiskNodes(
  token: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskNode[]> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskNode[]>(`/reports/performance-risk/nodes?${qs}`, token);
}

export async function getPerformanceRiskDetail(
  token: string,
  roId: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskDetail> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskDetail>(`/reports/performance-risk/nodes/${roId}?${qs}`, token);
}

export async function listPerformanceRiskUnlinkedRisks(
  token: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskRiskRow[]> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskRiskRow[]>(`/reports/performance-risk/unlinked-risks?${qs}`, token);
}
