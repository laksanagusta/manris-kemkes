import { api } from "@/lib/api";
import type {
  RiskObjective,
  RiskObjectiveStatus,
} from "@/types/risk-objective";
import { buildRiskObjectiveListQuery } from "./risk-objective-query";

export interface PaginatedRiskObjectiveResponse {
  data: RiskObjective[];
  total: number;
  page: number;
  limit: number;
}

export type ListRiskObjectivesParams = {
  organization_id?: string;
  period?: string;
  status?: RiskObjectiveStatus | "";
  q?: string;
  page?: number;
  limit?: number;
};

export type UpsertRiskObjectiveRequest = {
  organizationId: string;
  charterId?: string;
  period: string;
  tujuan: string;
  sasaran: string;
  indikatorKinerjaUtama: string;
  target: string;
  program: string;
  kegiatan: string;
  processBusiness: string;
  status: RiskObjectiveStatus;
};

export async function listRiskObjectives(
  token: string,
  params?: ListRiskObjectivesParams,
): Promise<PaginatedRiskObjectiveResponse> {
  const qs = buildRiskObjectiveListQuery(params);
  return api.get<PaginatedRiskObjectiveResponse>(
    `/risk-objectives${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function getRiskObjective(
  token: string,
  id: string,
): Promise<RiskObjective> {
  return api.get<RiskObjective>(`/risk-objectives/${id}`, token);
}

export async function createRiskObjective(
  token: string,
  payload: UpsertRiskObjectiveRequest,
): Promise<RiskObjective> {
  return api.post<RiskObjective>("/risk-objectives", payload, token);
}

export async function updateRiskObjective(
  token: string,
  id: string,
  payload: UpsertRiskObjectiveRequest,
): Promise<RiskObjective> {
  return api.put<RiskObjective>(`/risk-objectives/${id}`, payload, token);
}

export async function deleteRiskObjective(
  token: string,
  id: string,
): Promise<void> {
  return api.delete(`/risk-objectives/${id}`, token);
}