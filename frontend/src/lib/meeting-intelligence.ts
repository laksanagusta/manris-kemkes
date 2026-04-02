export const MEETING_INTELLIGENCE_PREFILL_KEY = "manris:meeting-intelligence-prefill";
export const MEETING_INTELLIGENCE_PREFILL_PREFIX = "manris:meeting-intelligence-prefill:";
export const MEETING_INTELLIGENCE_PREFILL_PARAM = "meetingPrefillToken";

export interface RiskDraftPrefill {
  title: string;
  description: string;
  riskCode?: string;
  source?: string;
  probability?: number;
  impact?: number;
  mitigation?: string;
  quote?: string;
  treatmentOption?: "avoid" | "mitigate" | "transfer" | "accept";
}

function getStorageKey(token: string) {
  return `${MEETING_INTELLIGENCE_PREFILL_PREFIX}${token}`;
}

export function createMeetingIntelligencePrefillToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function saveMeetingIntelligencePrefill(token: string, payload: RiskDraftPrefill) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(token), JSON.stringify(payload));
}

export function consumeMeetingIntelligencePrefill(token: string) {
  if (typeof window === "undefined") return null;
  const storageKey = getStorageKey(token);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  window.localStorage.removeItem(storageKey);

  try {
    return JSON.parse(raw) as RiskDraftPrefill;
  } catch {
    return null;
  }
}
