export const DOCUMENT_ANALYSIS_MODES = [
  "risk_event_extraction",
  "sop_risk_universe",
  "mitigation_report_mapper",
] as const;

export type DocumentAnalysisMode = (typeof DOCUMENT_ANALYSIS_MODES)[number];

export function isDocumentAnalysisMode(value: unknown): value is DocumentAnalysisMode {
  return typeof value === "string" && DOCUMENT_ANALYSIS_MODES.some((mode) => mode === value);
}

export interface DocumentSourceRef {
  quote: string;
  location?: string;
}

export interface DocumentRiskSuggestion {
  clientKey: string;
  title: string;
  description: string;
  category: string;
  riskSource: string;
  cause: string[];
  impactDesc: string[];
  existingControl?: string;
  controlGap?: string;
  probability: number;
  impact: number;
  treatmentOption: string;
  mitigations?: Array<{
    action?: string;
    owner?: string;
    dueDate?: string | null;
    frequency?: string;
    notes?: string;
  }>;
  reasoning: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
}

export interface SOPProcessStageSuggestion {
  clientKey: string;
  stageName: string;
  description: string;
  existingControl?: string;
  controlGap?: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
  suggestedRisks: DocumentRiskSuggestion[];
}

export interface SOPRiskUniverseResult {
  processStages: SOPProcessStageSuggestion[];
}

export interface MitigationTaskReportSuggestion {
  clientKey: string;
  taskId: string;
  riskCode: string;
  riskTitle: string;
  mitigationAction: string;
  periodLabel: string;
  reportNotes: string;
  reasoning: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
}

export interface MitigationReportMapperResult {
  taskMatches: MitigationTaskReportSuggestion[];
}

export interface RiskEventExtractionItem {
  clientKey: string;
  event: Partial<Omit<import("./risk-event").CreateRiskEventInput, "financialLoss" | "financialLossKnown">> & { financialLoss?: number | null; financialLossKnown?: boolean | null };
  sourceRefs: DocumentSourceRef[];
  missingFields: string[];
  confidence: number;
}

export interface DocumentIntelligenceResult {
  kejadian?: { items: RiskEventExtractionItem[] };
  mode: DocumentAnalysisMode;
  sop?: SOPRiskUniverseResult;
  mitigation?: MitigationReportMapperResult;
}

export interface DocumentIntelligenceDocumentMeta {
  filename: string;
  textLength: number;
  warnings: string[];
}

export interface DocumentIntelligenceResponse {
  mode: DocumentAnalysisMode;
  document: DocumentIntelligenceDocumentMeta;
  result: DocumentIntelligenceResult;
}
