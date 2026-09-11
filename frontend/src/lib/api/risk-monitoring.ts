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

export async function startMonitoring(
  token: string,
  riskId: string,
  cycle: string,
): Promise<StartMonitoringResponse> {
  return api.post<StartMonitoringResponse>(
    `/risks/${riskId}/monitorings`,
    { cycle },
    token,
  );
}

export async function listRiskMonitorings(
  token: string,
  params?: RiskMonitoringListParams,
): Promise<PaginatedRiskMonitoringResponse> {
  const searchParams = new URLSearchParams();

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
  return api.put<RiskMonitoringDetail>(
    `/risk-monitorings/${id}`,
    payload,
    token
  );
}

export async function finalizeMonitoring(
  token: string,
  id: string
): Promise<RiskMonitoringDetail> {
  return api.post<RiskMonitoringDetail>(
    `/risk-monitorings/${id}/finalize`,
    {},
    token
  );
}
