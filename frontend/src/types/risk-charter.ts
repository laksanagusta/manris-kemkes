export type RiskCharterUPRLevel = "eksekutif" | "upr_t1" | "upr_t2";
export type RiskCharterStatus = "draft" | "in_review" | "active" | "archived";

export interface RiskCharter {
  id: string;
  organizationId: string;
  uprLevel: RiskCharterUPRLevel;
  period: string;
  scope: string;
  legalBasis: string;
  internalContext: string;
  externalContext: string;
  stakeholderSummary: string;
  status: RiskCharterStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
