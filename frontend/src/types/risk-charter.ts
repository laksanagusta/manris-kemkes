export type RiskCharterStatus = "draft" | "in_review" | "approved" | "archived";
export type RiskCharterUPRLevel = "eksekutif" | "upr_t1" | "upr_t2";

export type RiskCharterStructureItem = {
  title: string;
  name: string;
};

export interface RiskCharter {
  id: string;
  organizationId: string;
  uprLevel: RiskCharterUPRLevel;
  period: string;
  riskOwnerName: string;
  riskOwnerUserId?: string;
  riskTeamName: string;
  scope: string;
  legalBasis: string;
  internalContext: string;
  externalContext: string;
  stakeholderSummary: string;
  uprStructure: RiskCharterStructureItem[];
  status: RiskCharterStatus;
  createdAt: string;
  updatedAt: string;
}
