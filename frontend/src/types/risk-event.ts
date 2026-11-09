export type RiskEventSeverity = "low" | "medium" | "high" | "extreme";
export type RiskEventNote = { id: string; eventId: string; body: string; createdBy: string; createdByName: string; createdAt: string };

export interface RiskEventRiskLink { id: string; code: string; title: string }

export interface RiskEventSourceRef { quote: string; location?: string }

export interface RiskEvent {
  notes?: RiskEventNote[];
  sourceDocumentName?: string;
  sourceRefs?: RiskEventSourceRef[];
  extractionKey?: string;
  id: string;
  code: string;
  description: string;
  occurredAt: string;
  impactTypes: string[];
  otherImpactType?: string;
  severity: RiskEventSeverity;
  financialLoss?: number;
  financialLossKnown?: boolean;
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
  sourceDocumentName?: string;
  sourceRefs?: RiskEventSourceRef[];
  extractionKey?: string;
  description: string;
  occurredAt: string;
  impactTypes: string[];
  otherImpactType?: string;
  severity: RiskEventSeverity;
  financialLoss?: number;
  financialLossKnown?: boolean;
  organizationId?: string;
  riskIds?: string[];
}
