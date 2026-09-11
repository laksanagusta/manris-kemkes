export type RiskCharterUPRLevel = "eksekutif" | "upr_t1" | "upr_t2";
export type RiskCharterStatus = "draft" | "active" | "superseded" | "archived";
export type RiskCharterUPRRole =
  | "chair"
  | "secretary"
  | "member"
  | "supervisor";

export interface RiskCharterLegalBasis {
  id: string;
  reference: string;
  provision: string;
}

export interface RiskCharterStakeholder {
  id: string;
  name: string;
  relationship: string;
}

export interface RiskCharterUPRMember {
  id: string;
  role: RiskCharterUPRRole;
  name: string;
  position: string;
  userId?: string;
}

export interface RiskCharter {
  id: string;
  title: string;
  organizationId: string;
  uprLevel: RiskCharterUPRLevel;
  period: string;
  scope: string;
  legalBasis: string;
  legalBases: RiskCharterLegalBasis[];
  internalContext: string;
  externalContext: string;
  stakeholderSummary: string;
  stakeholders: RiskCharterStakeholder[];
  uprStructure: RiskCharterUPRMember[];
  status: RiskCharterStatus;
  versionGroupId: string;
  previousVersionId?: string;
  versionNumber: number;
  isCurrent: boolean;
  revisionReason: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}
