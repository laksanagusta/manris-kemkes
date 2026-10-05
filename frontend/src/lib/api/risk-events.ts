import { api } from "@/lib/api";
import type { CreateRiskEventInput } from "@/types/risk-event";
import { normalizeRiskEvent, type RiskEventResponse } from "@/lib/risk-event-response";

export function listRiskEvents(token: string, riskId?: string) {
  const suffix = riskId ? `?risk_id=${encodeURIComponent(riskId)}` : "";
  return api.get<RiskEventResponse[]>(`/risk-events${suffix}`, token).then((events) => events.map(normalizeRiskEvent));
}

export function getRiskEvent(token: string, id: string) {
  return api.get<RiskEventResponse>(`/risk-events/${id}`, token).then(normalizeRiskEvent);
}

export function createRiskEvent(token: string, input: CreateRiskEventInput) {
  return api.post<RiskEventResponse>("/risk-events", input, token).then(normalizeRiskEvent);
}

export function linkRiskEvent(token: string, id: string, riskIds: string[]) {
  return api.post<RiskEventResponse>(`/risk-events/${id}/risks`, { riskIds }, token).then(normalizeRiskEvent);
}
