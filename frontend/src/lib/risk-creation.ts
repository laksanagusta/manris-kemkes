import { businessNow } from "./business-clock.ts";
import { currentAssessmentCycle } from "./risk-cycle-options.ts";

export function riskPeriodLabel(cycle: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(cycle);
  if (!match) return cycle;
  return `Triwulan ${["I", "II", "III", "IV"][Number(match[2]) - 1]} ${match[1]}`;
}

export function riskFinalizationCycle(cycle: string, initialProfile: boolean, now = businessNow()) {
  return initialProfile ? currentAssessmentCycle(now) : cycle;
}

export function hasRiskScore(probability: number, impact: number) {
  return probability >= 1 && probability <= 5 && impact >= 1 && impact <= 5;
}
