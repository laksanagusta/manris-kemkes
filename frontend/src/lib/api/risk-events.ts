import { api } from "@/lib/api";
import type { CreateRiskEventInput } from "@/types/risk-event";
import { normalizeRiskEvent, type RiskEventResponse } from "@/lib/risk-event-response";

export function listRiskEvents(token: string, riskId?: string) {
  const suffix = riskId ? `?risk_id=${encodeURIComponent(riskId)}` : "";
  return api.get<RiskEventResponse[]>(`/risk-events${suffix}`, token).then((events) => events.map(normalizeRiskEvent));
}

export async function listRiskEventPage(token: string, options: {
  page: number;
  limit: number;
  q?: string;
  severity?: string;
  organizationId?: string;
  sortBy: string;
  sortOrder: string;
}, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(options.page), limit: String(options.limit),
    sort_by: options.sortBy, sort_order: options.sortOrder,
  });
  if (options.q) params.set("q", options.q);
  if (options.severity) params.set("severity", options.severity);
  if (options.organizationId) params.set("organization_id", options.organizationId);
  const response = await api.get<{ data: RiskEventResponse[]; total: number }>(
    `/risk-events?${params}`, token, { signal },
  );
  return { data: response.data.map(normalizeRiskEvent), total: response.total };
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
