import type { RiskEvent } from "../types/risk-event";

export type RiskEventResponse = Omit<RiskEvent, "linkedRisks"> & {
  linkedRisks?: RiskEvent["linkedRisks"] | null;
};

/** Go serializes an empty nil slice as null; consumers always receive an array. */
export function normalizeRiskEvent(event: RiskEventResponse): RiskEvent {
  return { ...event, linkedRisks: event.linkedRisks ?? [] };
}
