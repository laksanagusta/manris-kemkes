export type DocumentAnalysisMode =
  | "sop_risk_universe"
  | "audit_finding_mapper"
  | "strategic_objective_risk"
  | "mitigation_report_mapper";

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
  relatedObjectiveText?: string;
  relatedIkuText?: string;
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

export interface AuditFindingSuggestion {
  clientKey: string;
  findingTitle: string;
  findingDescription: string;
  rootCause: string;
  impact: string;
  affectedArea: string;
  mappingStatus: string;
  existingRiskId?: string;
  existingRiskCode?: string;
  existingRiskTitle?: string;
  suggestedRisk?: DocumentRiskSuggestion;
  reasoning: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
}

export interface AuditFindingMapperResult {
  findings: AuditFindingSuggestion[];
}

export interface StrategicIKUSuggestion {
  clientKey: string;
  name: string;
  target?: string;
  program?: string;
  kegiatan?: string;
  processBusiness?: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
  suggestedRisks: DocumentRiskSuggestion[];
}

export interface StrategicObjectiveSuggestion {
  clientKey: string;
  tujuan: string;
  sasaran: string;
  period?: string;
  unit?: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
  ikus: StrategicIKUSuggestion[];
}

export interface StrategicObjectiveRiskResult {
  objectives: StrategicObjectiveSuggestion[];
}

export interface MitigationTaskReportSuggestion {
  clientKey: string;
  taskId: string;
  riskCode: string;
  riskTitle: string;
  mitigationAction: string;
  periodLabel: string;
  suggestedStatus: string;
  progressPct: number;
  actualCost: number;
  reportNotes: string;
  blocker?: string;
  reasoning: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
}

export interface MitigationReportMapperResult {
  taskMatches: MitigationTaskReportSuggestion[];
}

export interface DocumentIntelligenceResult {
  mode: DocumentAnalysisMode;
  sop?: SOPRiskUniverseResult;
  audit?: AuditFindingMapperResult;
  strategic?: StrategicObjectiveRiskResult;
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
