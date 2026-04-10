export type WorkingPaperStatus = 'draft' | 'signing' | 'completed' | 'cancelled';
export type SignatoryStatus = 'pending' | 'signed';

export interface RiskSnapshot {
  original_risk_id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  org_name: string;
  probability: number;
  impact: number;
  bobot: number;
  nilai: number;
  tingkat_risiko: string;
  prioritas_risiko: number;
  sebab: string[];
  sumber_risiko: string;
  control_uncontrol: string;
  dampak: string[];
  pengendalian_uraian: string;
  pengendalian_efektif: string;
  pengendalian_ada_tidak_efektif: string;
  selera_risiko: string;
  penanganan_risiko: string;
  rpr_uraian: string;
  rpr_jadwal: string;
  rpr_penanggung_jawab: string;
  target_p: number;
  target_d: number;
  target_bobot: number;
  target_nilai: number;
  target_tingkat_risiko: string;
  monitoring_p?: number;
  monitoring_d?: number;
  monitoring_bobot?: number;
  monitoring_nilai?: number;
  monitoring_tingkat_risiko?: string;
  monitoring_simpulan_tingkat_risiko?: string;
  monitoring_efektivitas?: string;
  jadwal_pelaksanaan?: string;
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
  risk_snapshots: RiskSnapshot[];
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
  signatories: CreateSignatoryInput[];
}

export interface WorkingPaperListResponse {
  data: WorkingPaper[];
  total: number;
  page: number;
  limit: number;
}
