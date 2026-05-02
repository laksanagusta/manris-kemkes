export type TMPMRStatus = "draft" | "submitted" | "reviewed" | "approved";

export type TMPMRDimension =
  | "governance"
  | "context_criteria"
  | "risk_assessment"
  | "risk_treatment"
  | "monitoring_review"
  | "recording_reporting";

export type TMPMRItem = {
  id: string;
  assessmentId: string;
  dimension: TMPMRDimension | string;
  question: string;
  score: number;
  evidenceUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TMPMRAssessment = {
  id: string;
  organizationId: string;
  period: string;
  assessorId?: string | null;
  reviewerId?: string | null;
  status: TMPMRStatus;
  score: number;
  maturityLevel: string;
  reviewNote: string;
  items: TMPMRItem[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedTMPMRResponse = {
  data: TMPMRAssessment[];
  total: number;
  page: number;
  limit: number;
};

export type ListTMPMRParams = {
  organizationId?: string;
  period?: string;
  status?: TMPMRStatus;
  page?: number;
  limit?: number;
};

export type TMPMRItemPayload = {
  id?: string;
  dimension: string;
  question: string;
  score: number;
  evidenceUrl: string;
  notes: string;
};

export type UpsertTMPMRRequest = {
  organizationId: string;
  period: string;
  assessorId?: string;
  items: TMPMRItemPayload[];
};

export type ReviewTMPMRRequest = {
  reviewerId?: string;
  reviewNote: string;
};
