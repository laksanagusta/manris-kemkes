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
  organizationName?: string;
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

export type TMPMRSummary = {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  periods: string[];
};

export type PaginatedTMPMRResponse = {
  summary: TMPMRSummary;
  data: TMPMRAssessment[];
  total: number;
  page: number;
  limit: number;
};

export type ListTMPMRParams = {
  q?: string;
  sort_by?: string;
  sort_order?: string;
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
