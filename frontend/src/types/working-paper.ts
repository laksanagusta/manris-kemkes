export type WorkingPaperStatus = 'draft' | 'signing' | 'completed' | 'cancelled';
export type SignatoryStatus = 'pending' | 'signed';
export type WorkingPaperRiskSourceMode = "latest_approved" | "review_periodic";

export interface WorkingPaperRiskData {
  id: string;
  code: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  nilai: number;
  tingkat_risiko: string;
  assessment_cycle?: string;
}

export interface WorkingPaperRiskLink {
  id: string;
  working_paper_id: string;
  risk_id: string;
  sort_order: number;
  source_mode: WorkingPaperRiskSourceMode;
  created_at: string;
  risk: WorkingPaperRiskData;
}

export interface WorkingPaperSignatory {
  id: string;
  working_paper_id: string;
  user_id: string;
  sequence_no: number;
  signer_name: string;
  signer_nip?: string;
  signer_title: string;
  signer_role_label: string;
  status: SignatoryStatus;
  signed_at?: string;
  qr_code_png?: string;
  qr_data?: Record<string, unknown>;
  created_at: string;
}

export interface WorkingPaper {
  id: string;
  title: string;
  description?: string;
  org_id: string;
  status: WorkingPaperStatus;
  assessment_cycle?: string;
  risks: WorkingPaperRiskLink[];
  document_hash?: string;
  current_signatory_sequence: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
  signatories: WorkingPaperSignatory[];
}

export interface CreateSignatoryInput {
  user_id: string;
  sequence_no: number;
  signer_name: string;
  signer_nip?: string;
  signer_title: string;
  signer_role_label: string;
}

export interface CreateWorkingPaperRequest {
  title: string;
  description?: string;
  assessment_cycle?: string;
  risk_ids: string[];
  risk_source_mode: string;
  signatories: CreateSignatoryInput[];
}

export interface WorkingPaperListResponse {
  data: WorkingPaper[];
  total: number;
  page: number;
  limit: number;
}
