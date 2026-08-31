import { api } from "@/lib/api";
import type {
  PaginatedRiskMonitoringResponse,
  RiskMonitoringDetail,
  RiskMonitoringListParams,
  MonitoringBatchPayload,
  MonitoringBatchResponse,
  MonitoringPreviewResponse,
} from "@/types/risk-monitoring";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * Download monitoring template XLSX
 * GET /risks/batch/monitoring/template?organization_id=X&cycle=YYYY-QN
 */
export async function downloadMonitoringTemplate(
  token: string,
  orgId: string,
  cycle: string
): Promise<Blob> {
  const query = new URLSearchParams({
    organization_id: orgId,
    cycle,
  });
  const response = await fetch(
    `${API_BASE}/risks/batch/monitoring/template?${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new Error("Gagal mengunduh template pemantauan.");
  }
  return response.blob();
}

/**
 * Upload and preview monitoring template
 * POST /risks/batch/monitoring/preview?organization_id=X&cycle=YYYY-QN
 */
export async function previewMonitoringUpload(
  file: File,
  token: string,
  orgId: string,
  cycle: string
): Promise<MonitoringPreviewResponse> {
  const form = new FormData();
  form.append("file", file);
  const query = new URLSearchParams({
    organization_id: orgId,
    cycle,
  });
  return api.postForm<MonitoringPreviewResponse>(
    `/risks/batch/monitoring/preview?${query}`,
    form,
    token
  );
}

/**
 * Submit monitoring batch (create monitoring transactions)
 * POST /risks/batch/monitoring?organization_id=X
 */
export async function submitMonitoringBatch(
  items: MonitoringBatchPayload[],
  token: string,
  orgId: string,
  cycle: string
): Promise<MonitoringBatchResponse> {
  return api.post<MonitoringBatchResponse>(
    `/risks/batch/monitoring?organization_id=${orgId}&cycle=${cycle}`,
    { items, cycle },
    token
  );
}

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
