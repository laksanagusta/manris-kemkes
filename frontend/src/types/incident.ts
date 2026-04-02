export type IncidentSeverity = "insignificant" | "minor" | "major" | "critical";

export interface IncidentRiskLink {
  id: string;
  code: string;
  title: string;
}

export interface IncidentRecord {
  id: string;
  code?: string | null;
  title: string;
  what: string;
  who: string;
  when?: string | null;
  where: string;
  whyHow: string;
  severity: string;
  status: string;
  correctiveAction: string;
  preventiveAction: string;
  linkedRiskId?: string | null;
  linkedRiskCode?: string | null;
  linkedRisks?: IncidentRiskLink[];
  reporterId?: string | null;
  reporterName?: string | null;
  organizationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDraft {
  title: string;
  what: string;
  who: string;
  when?: string | null;
  where: string;
  whyHow: string;
  severity: IncidentSeverity;
  correctiveAction: string;
  preventiveAction: string;
}

export interface IncidentRiskSuggestion {
  riskId: string;
  riskCode: string;
  riskTitle: string;
  reason: string;
  confidence: number;
}

export interface ManualIncidentRiskSuggestionRequest {
  title?: string;
  what: string;
  who: string;
  when: string;
  where: string;
  whyHow?: string;
  severity: IncidentSeverity;
  organizationId?: string | null;
}

export interface IncidentExtractionItem {
  clientKey: string;
  incident: IncidentDraft;
  riskSuggestions: IncidentRiskSuggestion[];
  missingFields: string[];
  warnings: string[];
  confidence: number;
}

export interface IncidentBatchExtraction {
  items: IncidentExtractionItem[];
  sourcePreview: string;
  documentWarnings: string[];
}

export interface IncidentBatchCreateItem {
  clientKey: string;
  title: string;
  what: string;
  who: string;
  when?: string | null;
  where: string;
  whyHow: string;
  severity: IncidentSeverity;
  correctiveAction: string;
  preventiveAction: string;
  linkedRiskIds: string[];
  organizationId?: string | null;
}

export interface IncidentBatchCreateResultItem {
  clientKey: string;
  id?: string;
  code?: string | null;
  status: "created" | "failed" | string;
  message: string;
  error?: string;
}

export interface IncidentSummary {
  total: number;
  draft: number;
  final: number;
  approved: number;
  rejected: number;
  open: number;
  investigating: number;
  resolved: number;
  closed: number;
}
