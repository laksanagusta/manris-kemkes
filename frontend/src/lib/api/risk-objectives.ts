import { api } from "@/lib/api";
import type { RiskObjective } from "@/types/risk-objective";

export interface PaginatedRiskObjectiveResponse {
  data: RiskObjective[];
  total: number;
  page: number;
  limit: number;
}

function toQuery(params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export async function listRiskObjectives(token: string, params?: Record<string, string | number | undefined>) {
  return api.get<PaginatedRiskObjectiveResponse>(`/risk-objectives${toQuery(params)}`, token);
}

export async function getRiskObjective(token: string, id: string) {
  return api.get<RiskObjective>(`/risk-objectives/${id}`, token);
}

export async function createRiskObjective(token: string, payload: Record<string, unknown>) {
  return api.post<{ id: string; message: string }>("/risk-objectives", payload, token);
}

export async function updateRiskObjective(token: string, id: string, payload: Record<string, unknown>) {
  return api.put<{ id: string; message: string }>(`/risk-objectives/${id}`, payload, token);
}

export async function deleteRiskObjective(token: string, id: string) {
  return api.delete<{ id: string; message: string }>(`/risk-objectives/${id}`, undefined, token);
}
