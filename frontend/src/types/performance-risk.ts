export type PerformanceRiskAttentionStatus = "critical" | "watch" | "stable" | "no_risk";

export interface PerformanceRiskSummary {
  period: string;
  totalRO: number;
  linkedRO: number;
  unlinkedRO: number;
  highOrExtremeRO: number;
  totalRisks: number;
  unlinkedRisks: number;
  totalMitigations: number;
  overdueMitigations: number;
}

export interface PerformanceRiskNode {
  roId: string;
  roTitle: string;
  activityTitle?: string;
  programTitle: string;
  ikuTitle: string;
  objectiveTitle?: string;
  planningId?: string;
  planningTitle?: string;
  planningStatus?: string;
  planningPeriod?: string;
  kegiatanTitle?: string;
  sasaranTitle?: string;
  tujuanTitle?: string;
  period?: string;
  riskCount: number;
  highestInherentScore: number;
  highestLevel: string;
  totalExposure: number;
  avgExposure: number;
  highExtremeCount: number;
  heatmap: number[][];
  mitigationTotal: number;
  mitigationPending: number;
  mitigationOverdue: number;
  mitigationProgressDone: number;
  mitigationProgressPending: number;
  mitigationProgressOverdue: number;
  mitigationProgressTotal: number;
  mitigationProgressPercent: number;
  attentionStatus: PerformanceRiskAttentionStatus;
}

export interface PerformanceRiskRiskRow {
  id: string;
  roId?: string;
  code: string;
  title: string;
  organizationId?: string;
  organizationName: string;
  probability: number;
  impact: number;
  inherentScore: number;
  category: string;
  status: string;
  assessmentCycle: string;
  mitigationDoneCount: number;
  mitigationPendingCount: number;
  mitigationOverdueCount: number;
}

export interface PerformanceRiskMitigationRow {
  id: string;
  riskId: string;
  riskCode: string;
  riskTitle: string;
  action: string;
  owner: string;
  dueDate?: string;
  status: "pending" | "overdue" | string;
  organizationName: string;
}

export interface PerformanceRiskUnitBreakdown {
  organizationId?: string;
  organizationName: string;
  riskCount: number;
  totalExposure: number;
  highExtremeCount: number;
}

export interface PerformanceRiskDetail {
  node: PerformanceRiskNode;
  risks: PerformanceRiskRiskRow[];
  mitigations: PerformanceRiskMitigationRow[];
  units: PerformanceRiskUnitBreakdown[];
  generatedAt: string;
}

export interface PerformanceRiskQuery {
  period?: string;
  planningId?: string;
  orgId?: string;
}
