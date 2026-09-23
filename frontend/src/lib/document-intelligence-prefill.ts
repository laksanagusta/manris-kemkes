export const DOCUMENT_INTELLIGENCE_PREFILL_KEY =
  "manris:document-intelligence-prefill";
export const DOCUMENT_INTELLIGENCE_PREFILL_PREFIX =
  "manris:document-intelligence-prefill:";
export const DOCUMENT_INTELLIGENCE_PREFILL_PARAM = "documentPrefillToken";

export type DocumentIntelligencePrefill = {
  kind: "risk";
  findingId?: string;
  title: string;
  description: string;
  riskCode?: string;
  source?: string;
  probability?: number;
  impact?: number;
  mitigation?: string;
  quote?: string;
  treatmentOption?:
    | "menerima"
    | "mitigasi"
    | "avoid"
    | "mitigate"
    | "transfer"
    | "accept";
};

function getStorageKey(token: string) {
  return `${DOCUMENT_INTELLIGENCE_PREFILL_PREFIX}${token}`;
}

function parseStoredPrefill<T>(raw: string | null): T | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

export function createDocumentIntelligencePrefillToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function saveDocumentIntelligencePrefill(
  token: string,
  payload: DocumentIntelligencePrefill,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(token), JSON.stringify(payload));
}

export function consumeDocumentIntelligencePrefill(token: string) {
  if (typeof window === "undefined") return null;

  const storageKey = getStorageKey(token);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  window.localStorage.removeItem(storageKey);
  return parseStoredPrefill<DocumentIntelligencePrefill>(raw);
}
