export type RiskEventSeverity = "low" | "medium" | "high" | "extreme";
export type RiskEventCondition = "recovered" | "controlled" | "ongoing" | "worsening" | "unknown";

export interface RiskEventRiskLink { id: string; code: string; title: string }

export interface RiskEvent {
  id: string;
  code: string;
  description: string;
  occurredAt: string;
  impactTypes: string[];
  otherImpactType?: string;
  actualImpact: string;
  severity: RiskEventSeverity;
  immediateResponse: string;
  postResponseCondition: RiskEventCondition;
  location?: string;
  affectedParties?: string;
  suspectedCause?: string;
  financialLoss?: number;
  financialLossKnown?: boolean;
  disruptionDuration?: string;
  extraordinaryReason?: string;
  ongoingAction?: string;
  evidenceUrl?: string;
  organizationId: string;
  organizationName?: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  linkedRisks: RiskEventRiskLink[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRiskEventInput {
  description: string;
  occurredAt: string;
  impactTypes: string[];
  otherImpactType?: string;
  actualImpact: string;
  severity: RiskEventSeverity;
  immediateResponse: string;
  postResponseCondition: RiskEventCondition;
  location?: string;
  affectedParties?: string;
  suspectedCause?: string;
  financialLoss?: number;
  financialLossKnown?: boolean;
  disruptionDuration?: string;
  extraordinaryReason?: string;
  ongoingAction?: string;
  evidenceUrl?: string;
  organizationId?: string;
  riskIds: string[];
}
