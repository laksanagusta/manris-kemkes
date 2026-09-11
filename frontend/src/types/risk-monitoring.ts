import type { Risk, RiskMitigation } from "./risk";

export type RiskMonitoringStatus = "draft" | "final";

export interface RiskMonitoringDetail {
  id: string;
  sourceRiskId: string;
  versionGroupId: string;
  resultRiskId?: string | null;
  assessmentCycle: string;
  status: RiskMonitoringStatus;
  mode: string;
  sourceProbability: number;
  sourceImpact: number;
  sourceWeight: number;
  sourceNilai: number;
  sourceLevel: string;
  sourceVersionNumber: number;
  observedProbability: number;
  observedImpact: number;
  observedWeight: number;
  observedNilai: number;
  observedLevel: string;
  conclusion: string;
  mitigationProgressSummary: string;
  mitigationCompletionPercent: number;
  draftTitle: string;
  draftDescription: string;
  draftCategory: string;
  draftCause: string[];
  draftRiskSource: string;
  draftControllability: string;
  draftImpactDesc: string[];
  draftExistingControl: string;
  draftControlEffectiveness: string;
  draftTreatmentOption: string;
  draftMitigations?: RiskMitigation[];
  profileChangeSummary: string[];
  changeReason: string;
  startedAt: string;
  updatedAt?: string;
  finalizedAt?: string | null;
  sourceRisk?: Risk | null;
  resultRisk?: Risk | null;
}

export interface PaginatedRiskMonitoringResponse {
  data: RiskMonitoringDetail[];
  total: number;
  page: number;
  limit: number;
}

export interface RiskMonitoringListParams {
  q?: string;
  lifecycle?: "active" | "archived" | "all";
  status?: string;
  category?: string;
  assessment_cycle?: string;
  created_at?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}
