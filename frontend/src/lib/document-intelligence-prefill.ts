export const DOCUMENT_INTELLIGENCE_PREFILL_KEY =
  "manris:document-intelligence-prefill";
export const DOCUMENT_INTELLIGENCE_PREFILL_PREFIX =
  "manris:document-intelligence-prefill:";
export const DOCUMENT_INTELLIGENCE_PREFILL_PARAM = "documentPrefillToken";
export const DOCUMENT_INTELLIGENCE_LATEST_MITIGATION_KEY =
  "manris:document-intelligence-latest-mitigation";

export type DocumentIntelligencePrefill =
  | {
      kind: "risk";
      title: string;
      description: string;
      riskCode?: string;
      source?: string;
      probability?: number;
      impact?: number;
      mitigation?: string;
      quote?: string;
      treatmentOption?: "menerima" | "mitigasi" | "avoid" | "mitigate" | "transfer" | "accept";
    }
  | {
      kind: "objective";
      organizationId?: string;
      period?: string;
      tujuan?: string;
      sasaran?: string;
      indikatorKinerjaUtama?: string;
      target?: string;
      program?: string;
      kegiatan?: string;
      processBusiness?: string;
      quote?: string;
    }
  | {
      kind: "mitigation-report";
      taskId: string;
      progressPct?: number;
      actualCost?: number;
      notes?: string;
      quote?: string;
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

export function saveLatestMitigationReportPrefill(
  payload: Extract<DocumentIntelligencePrefill, { kind: "mitigation-report" }>,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DOCUMENT_INTELLIGENCE_LATEST_MITIGATION_KEY,
    JSON.stringify(payload),
  );
}

export function consumeLatestMitigationReportPrefill() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(
    DOCUMENT_INTELLIGENCE_LATEST_MITIGATION_KEY,
  );
  if (!raw) return null;

  window.localStorage.removeItem(DOCUMENT_INTELLIGENCE_LATEST_MITIGATION_KEY);
  const parsed = parseStoredPrefill<DocumentIntelligencePrefill>(raw);
  return parsed?.kind === "mitigation-report" ? parsed : null;
}
