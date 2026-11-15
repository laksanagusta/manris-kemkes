import { api } from "@/lib/api";

export type MonitoringRuleFrequency = "monthly" | "quarterly" | "semester";

export interface MonitoringRulePeriod {
  id: string;
  label: string;
  ordinal: number;
  opensOn: string;
  closesOn: string;
}

export interface MonitoringRule {
  id: string;
  name: string;
  year: number;
  frequency: MonitoringRuleFrequency;
  active: boolean;
  inUse?: boolean;
  periods: MonitoringRulePeriod[];
}

export type CreateMonitoringRuleInput = Omit<MonitoringRule, "id" | "periods" | "inUse"> & {
  periods: Omit<MonitoringRulePeriod, "id">[];
};

export function listMonitoringRules(token: string, signal?: AbortSignal, includeInactive = false, search?: { query: string; limit: number }): Promise<MonitoringRule[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  if (search) { params.set("search", search.query); params.set("limit", String(search.limit)); }
  return api.get<MonitoringRule[]>(`/monitoring-rules${params.size ? `?${params}` : ""}`, token, { signal });
}

export function createMonitoringRule(token: string, input: CreateMonitoringRuleInput): Promise<MonitoringRule> {
  return api.post<MonitoringRule>("/monitoring-rules", input, token);
}

export function updateMonitoringRule(token: string, id: string, input: CreateMonitoringRuleInput): Promise<MonitoringRule> {
  return api.put<MonitoringRule>(`/monitoring-rules/${id}`, input, token);
}

export function deleteMonitoringRule(token: string, id: string): Promise<void> {
  return api.delete<void>(`/monitoring-rules/${id}`, undefined, token);
}
