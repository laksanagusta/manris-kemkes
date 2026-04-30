export type WorkingPaperStatus = 'draft' | 'signing' | 'completed' | 'cancelled';
export type SignatoryStatus = 'pending' | 'signed';
export type WorkingPaperRiskSourceMode = "latest_approved" | "review_periodic";

export interface WorkingPaperRiskData {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  org_name?: string;
  probability: number;
  impact: number;
  bobot: number;
  nilai: number;
  tingkat_risiko: string;
  tingkat_risiko_display?: string;
  prioritas_risiko: number;
  cause?: string[];
  risk_source?: string;
  controllability?: string;
  impact_desc?: string[];
  existing_control?: string;
  control_effectiveness?: string;
  control_effectiveness_display?: string;
  risk_appetite?: string;
  risk_appetite_display?: string;
  treatment_option?: string;
  treatment_option_display?: string;
  mitigations?: string[];
  mitigation_due_dates?: string[];
  target_probability?: number;
  target_impact?: number;
  target_bobot?: number;
  target_nilai?: number;
  target_tingkat_risiko?: string;
  target_tingkat_risiko_display?: string;
  assessment_cycle?: string;
  versionNumber?: number;
  objective_tujuan?: string;
  objective_sasaran?: string;
  objective_iku?: string;
  objective_target?: string;
  objective_program?: string;
  objective_kegiatan?: string;

  // Previous semester risk profile (for sheets 1 & 2)
  previous?: WorkingPaperRiskSnapshot;

  // Monitoring/realization data (for sheet 3)
  monitoring_p?: number;
  monitoring_d?: number;
  monitoring_bobot?: number;
  monitoring_nilai?: number;
  monitoring_tingkat_risiko?: string;
  monitoring_tingkat_risiko_display?: string;
  monitoring_simpulan?: string;
  monitoring_efektivitas?: string;
  jadwal_pelaksanaan?: string;
  penanggung_jawab?: string;
}

export interface WorkingPaperRiskSnapshot {
  probability?: number;
  impact?: number;
  bobot?: number;
  nilai?: number;
  tingkat_risiko?: string;
  tingkat_risiko_display?: string;
  prioritas_risiko?: number;
  cause?: string[];
  risk_source?: string;
  controllability?: string;
  impact_desc?: string[];
  risk_appetite?: string;
  risk_appetite_display?: string;
  treatment_option?: string;
  treatment_option_display?: string;
  existing_control?: string;
  control_effectiveness?: string;
  control_effectiveness_display?: string;
  target_probability?: number;
  target_impact?: number;
  target_bobot?: number;
  target_nilai?: number;
  target_tingkat_risiko?: string;
  target_tingkat_risiko_display?: string;
  mitigations?: string[];
  mitigation_due_dates?: string[];
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
  signer_jabatan: string;
  signer_pangkat: string;
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
  signer_jabatan: string;
  signer_pangkat: string;
}

export interface CreateWorkingPaperRiskInput {
  risk_id: string;
  source_mode: WorkingPaperRiskSourceMode;
}

export interface CreateWorkingPaperRequest {
  title: string;
  description?: string;
  assessment_cycle?: string;
  risks: CreateWorkingPaperRiskInput[];
  signatories: CreateSignatoryInput[];
}

export interface WorkingPaperListResponse {
  data: WorkingPaper[];
  total: number;
  page: number;
  limit: number;
}
