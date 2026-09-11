import { api } from "@/lib/api";
import type {
  RiskCharter,
  RiskCharterLegalBasis,
  RiskCharterStakeholder,
  RiskCharterUPRLevel,
  RiskCharterUPRMember,
} from "@/types/risk-charter";
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

export type CreateRiskCharterRequest = {
  title: string;
  organizationId: string;
  uprLevel: RiskCharterUPRLevel;
  period: string;
};

export type CreateRiskCharterResponse = {
  data: RiskCharter;
  existing: boolean;
};

export type UpdateRiskCharterRequest = {
  title: string;
  scope: string;
  legalBases: RiskCharterLegalBasis[];
  internalContext: string;
  externalContext: string;
  stakeholders: RiskCharterStakeholder[];
  uprStructure: RiskCharterUPRMember[];
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
  payload: CreateRiskCharterRequest,
): Promise<CreateRiskCharterResponse> {
  return api.post<CreateRiskCharterResponse>("/risk-charters", payload, token);
}

export async function updateRiskCharter(
  token: string,
  id: string,
  payload: UpdateRiskCharterRequest,
): Promise<RiskCharter> {
  return api.put<RiskCharter>(`/risk-charters/${id}`, payload, token);
}

export async function finalizeRiskCharter(token: string, id: string) {
  return api.post<RiskCharter>(`/risk-charters/${id}/finalize`, {}, token);
}

export async function createRiskCharterRevision(
  token: string,
  id: string,
  reason: string,
): Promise<CreateRiskCharterResponse> {
  return api.post<CreateRiskCharterResponse>(
    `/risk-charters/${id}/revisions`,
    { reason },
    token,
  );
}

export async function listRiskCharterVersions(token: string, id: string) {
  return api.get<RiskCharter[]>(`/risk-charters/${id}/versions`, token);
}

export async function archiveRiskCharter(token: string, id: string) {
  return api.post<RiskCharter>(`/risk-charters/${id}/archive`, {}, token);
}

export async function restoreRiskCharter(token: string, id: string) {
  return api.post<RiskCharter>(`/risk-charters/${id}/restore`, {}, token);
}

export async function deleteRiskCharterDraft(token: string, id: string) {
  return api.delete<void>(`/risk-charters/${id}`, undefined, token);
}
