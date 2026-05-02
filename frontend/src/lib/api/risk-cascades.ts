import { api } from "@/lib/api";
import type { RiskCascadeListResponse, RiskCascadeRecord } from "@/types/risk-cascade";

export interface ListRiskCascadesParams {
  q?: string;
  status?: string;
  cascade_type?: string;
  page?: number;
  limit?: number;
}

export interface CreateRiskCascadeRequest {
  sourceRiskId: string;
  targetOrgId: string;
  analysisNote?: string;
}

export interface DecideRiskCascadeRequest {
  decision: "accept" | "reject";
  adoptionType?: "full" | "partial";
  decisionNote?: string;
}

export async function listRiskCascades(
  token: string,
  params?: ListRiskCascadesParams,
): Promise<RiskCascadeListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.cascade_type) searchParams.set("cascade_type", params.cascade_type);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const qs = searchParams.toString();
  return api.get<RiskCascadeListResponse>(`/risk-cascades${qs ? `?${qs}` : ""}`, token);
}

export async function createMandatoryRiskCascade(
  token: string,
  payload: CreateRiskCascadeRequest,
): Promise<RiskCascadeRecord> {
  return api.post<RiskCascadeRecord>("/risk-cascades/mandatory", payload, token);
}

export async function createBottomUpRiskCascade(
  token: string,
  payload: CreateRiskCascadeRequest,
): Promise<RiskCascadeRecord> {
  return api.post<RiskCascadeRecord>("/risk-cascades/bottom-up", payload, token);
}

export async function decideRiskCascade(
  token: string,
  id: string,
  payload: DecideRiskCascadeRequest,
): Promise<RiskCascadeRecord> {
  return api.post<RiskCascadeRecord>(`/risk-cascades/${id}/decision`, payload, token);
}

export async function deleteRiskCascade(token: string, id: string): Promise<void> {
  await api.delete(`/risk-cascades/${id}`, token);
}
