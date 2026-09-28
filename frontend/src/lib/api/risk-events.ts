import { api } from "@/lib/api";
import type { CreateRiskEventInput, RiskEvent } from "@/types/risk-event";

export function listRiskEvents(token: string, riskId?: string) {
  const suffix = riskId ? `?risk_id=${encodeURIComponent(riskId)}` : "";
  return api.get<RiskEvent[]>(`/risk-events${suffix}`, token);
}

export function getRiskEvent(token: string, id: string) {
  return api.get<RiskEvent>(`/risk-events/${id}`, token);
}

export function createRiskEvent(token: string, input: CreateRiskEventInput) {
  return api.post<RiskEvent>("/risk-events", input, token);
}

export function linkRiskEvent(token: string, id: string, riskIds: string[]) {
  return api.post<RiskEvent>(`/risk-events/${id}/risks`, { riskIds }, token);
}

