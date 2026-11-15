import { api } from "@/lib/api";
import type {
  PaginatedRiskMonitoringResponse,
  RiskMonitoringDetail,
  RiskMonitoringListParams,
} from "@/types/risk-monitoring";

export async function getMonitoringDetail(
  token: string,
  id: string
): Promise<RiskMonitoringDetail> {
  return api.get<RiskMonitoringDetail>(`/risk-monitorings/${id}`, token);
}

export interface StartMonitoringResponse {
  monitoring: RiskMonitoringDetail;
  message: string;
  redirectUrl: string;
  existingDraft: boolean;
}

interface MonitoringMutationResponse {
  monitoring: RiskMonitoringDetail;
  message: string;
  updatedMode?: string;
}

export async function startMonitoring(
  token: string,
  riskId: string,
  observedAt: string,
  periodContext?: {profileVersionId:string;monitoringPeriodId:string},
): Promise<StartMonitoringResponse> {
  return api.post<StartMonitoringResponse>(
    `/risks/${riskId}/monitorings`,
    { observedAt, ...periodContext },
    token,
  );
}

export async function listRiskMonitorings(
  token: string,
  params?: RiskMonitoringListParams,
): Promise<PaginatedRiskMonitoringResponse> {
  const searchParams = new URLSearchParams();

  if (params?.org_id) searchParams.set("org_id", params.org_id);
  if (params?.q) searchParams.set("q", params.q);
  if (params?.lifecycle && params.lifecycle !== "active") {
    searchParams.set("lifecycle", params.lifecycle);
  }
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.assessment_cycle) {
    searchParams.set("assessment_cycle", params.assessment_cycle);
  }
  if (params?.created_at) searchParams.set("created_at", params.created_at);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const qs = searchParams.toString();
  return api.get<PaginatedRiskMonitoringResponse>(
    `/risk-monitorings${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function updateMonitoringDraft(
  token: string,
  id: string,
  payload: Record<string, unknown>
): Promise<RiskMonitoringDetail> {
  const result = await api.put<MonitoringMutationResponse>(
    `/risk-monitorings/${id}`,
    payload,
    token
  );
  return result.monitoring;
}

export async function deleteMonitoringDraft(
  token: string,
  id: string,
): Promise<void> {
  await api.delete<void>(`/risk-monitorings/${id}`, undefined, token);
}

export async function finalizeMonitoring(
  token: string,
  id: string,
  review: { expectedUpdatedAt?: string; reportRevision: string },
): Promise<RiskMonitoringDetail> {
  const result = await api.post<MonitoringMutationResponse>(
    `/risk-monitorings/${id}/finalize`,
    review,
    token
  );
  return result.monitoring;
}

export interface StartRiskRevisionResponse {
  riskId: string;
  redirectUrl: string;
  existingDraft: boolean;
}

export async function startRiskRevision(token: string, riskId: string, input: { changeReason: string }): Promise<StartRiskRevisionResponse> {
  const result = await api.post<StartRiskRevisionResponse>(`/risks/${encodeURIComponent(riskId)}/revisions`, input, token);
  if (!result || typeof result.riskId !== "string" || !result.riskId.trim()) {
    throw new Error("Draf revisi belum dapat dibuka. Coba muat ulang halaman.");
  }
  return { ...result, redirectUrl: `/risk/register/new?id=${encodeURIComponent(result.riskId)}` };
}
