import { api } from "@/lib/api";
import type { RiskCharter } from "@/types/risk-charter";

export interface PaginatedRiskCharterResponse {
  data: RiskCharter[];
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

export async function listRiskCharters(token: string, params?: Record<string, string | number | undefined>) {
  return api.get<PaginatedRiskCharterResponse>(`/risk-charters${toQuery(params)}`, token);
}

export async function getRiskCharter(token: string, id: string) {
  return api.get<RiskCharter>(`/risk-charters/${id}`, token);
}

export async function createRiskCharter(token: string, payload: Record<string, unknown>) {
  return api.post<{ id: string; message: string }>("/risk-charters", payload, token);
}

export async function updateRiskCharter(token: string, id: string, payload: Record<string, unknown>) {
  return api.put<{ id: string; message: string }>(`/risk-charters/${id}`, payload, token);
}
