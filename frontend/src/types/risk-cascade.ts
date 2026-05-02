export type RiskCascadeType =
  | "mandatory_top_down"
  | "recommended_top_down"
  | "bottom_up_escalation";

export type RiskCascadeStatus =
  | "proposed"
  | "analyzed"
  | "accepted"
  | "rejected"
  | "implemented";

export interface RiskCascadeRecord {
  id: string;
  sourceRiskId: string;
  targetRiskId?: string | null;
  sourceOrgId: string;
  targetOrgId: string;
  cascadeType: RiskCascadeType;
  adoptionType?: "full" | "partial" | null;
  status: RiskCascadeStatus;
  analysisNote: string;
  decisionNote: string;
  createdAt: string;
  sourceRiskCode?: string;
  sourceRiskTitle?: string;
  targetRiskCode?: string;
  targetRiskTitle?: string;
  sourceOrgName?: string;
  targetOrgName?: string;
  proposedByName?: string;
  decidedByName?: string;
  proposedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

export interface RiskCascadeListResponse {
  data: RiskCascadeRecord[];
  total: number;
  page: number;
  limit: number;
}
