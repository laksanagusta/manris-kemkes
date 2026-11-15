import type { MonitoringRulePeriod } from "./api/monitoring-rules";

export type UnitProgressProfile = {
  id: string;
  label: string;
  year: number;
  ruleId: string;
  frequency: "monthly" | "quarterly" | "semester";
  periods: MonitoringRulePeriod[];
};

export function unitProgressPeriods(profile: UnitProgressProfile): { value: string; label: string; opensOn: string; closesOn: string }[] {
  return profile.periods.slice().sort((a, b) => a.ordinal - b.ordinal).map((period) => ({
    value: period.id, label: period.label, opensOn: period.opensOn, closesOn: period.closesOn,
  }));
}

export function defaultUnitProgressPeriod(profile: UnitProgressProfile, today: string): string {
  const periods = unitProgressPeriods(profile);
  return (periods.find((period) => period.opensOn <= today && today <= period.closesOn)
    ?? periods.filter((period) => period.closesOn < today).at(-1)
    ?? periods[0])?.value ?? "";
}
