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
  periods: MonitoringRulePeriod[];
}

export type CreateMonitoringRuleInput = Omit<MonitoringRule, "id" | "periods"> & {
  periods: Omit<MonitoringRulePeriod, "id">[];
};

export function listMonitoringRules(token: string, signal?: AbortSignal, includeInactive = false): Promise<MonitoringRule[]> {
  return api.get<MonitoringRule[]>(`/monitoring-rules${includeInactive ? "?includeInactive=true" : ""}`, token, { signal });
}

export function createMonitoringRule(token: string, input: CreateMonitoringRuleInput): Promise<MonitoringRule> {
  return api.post<MonitoringRule>("/monitoring-rules", input, token);
}
