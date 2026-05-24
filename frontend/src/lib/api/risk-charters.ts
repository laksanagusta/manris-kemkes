import { api } from "@/lib/api";
import type { RiskCharter, RiskCharterUPRLevel } from "@/types/risk-charter";
import { buildRiskCharterListQuery } from "./risk-charter-query";

export interface PaginatedRiskCharterResponse {
  data: RiskCharter[];
  total: number;
  page: number;
  limit: number;
}

export type ListRiskChartersParams = {
  organization_id?: string;
  period?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type UpsertRiskCharterRequest = {
  organizationId: string;
  uprLevel: RiskCharterUPRLevel;
  period: string;
  scope: string;
  legalBasis: string;
  internalContext: string;
  externalContext: string;
  stakeholderSummary: string;
  status?: string;
};

export async function listRiskCharters(
  token: string,
  params?: ListRiskChartersParams,
): Promise<PaginatedRiskCharterResponse> {
  const qs = buildRiskCharterListQuery(params);
  return api.get<PaginatedRiskCharterResponse>(
    `/risk-charters${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function getRiskCharter(
  token: string,
  id: string,
): Promise<RiskCharter> {
  return api.get<RiskCharter>(`/risk-charters/${id}`, token);
}

export async function createRiskCharter(
  token: string,
  payload: UpsertRiskCharterRequest,
): Promise<RiskCharter> {
  return api.post<RiskCharter>("/risk-charters", payload, token);
}

export async function updateRiskCharter(
  token: string,
  id: string,
  payload: UpsertRiskCharterRequest,
): Promise<RiskCharter> {
  return api.put<RiskCharter>(`/risk-charters/${id}`, payload, token);
}
