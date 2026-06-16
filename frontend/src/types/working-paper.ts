export type WorkingPaperStatus = 'draft' | 'signing' | 'completed' | 'cancelled';
export type SignatoryStatus = 'pending' | 'signed';
export type WorkingPaperRiskSourceMode = "latest_approved" | "review_periodic";

export interface WorkingPaperRiskMonitoring {
  id: string;
  status: "draft" | "finalized";
  assessmentCycle: string;
  sourceProbability: number;
  sourceImpact: number;
  sourceWeight: number;
  sourceNilai: number;
  sourceLevel: string;
  observedProbability: number;
  observedImpact: number;
  observedWeight: number;
  observedNilai: number;
  observedLevel: string;
  trend: "up" | "down" | "stable" | string;
  mitigationCompletionPercent: number;
  mitigationProgressSummary: string;
  effectivenessConclusion: string;
  conditionSummary: string;
  eventSummary: string;
  mitigationObstacles: string;
  mitigationFollowUp: string;
  followUpNote: string;
  startedAt: string;
  updatedAt: string;
  finalizedAt?: string;
}

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
  inherentScore?: number;
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
  mitigation_details?: string[];
  target_probability?: number;
  target_impact?: number;
  target_bobot?: number;
  target_nilai?: number;
  target_score?: number;
  target_tingkat_risiko?: string;
  target_tingkat_risiko_display?: string;
  assessment_cycle?: string;
  versionNumber?: number;
  previousRiskId?: string | null;

  // Previous semester risk profile (for sheets 1 & 2)
  previous?: WorkingPaperRiskSnapshot;

  // Monitoring/realization data (for sheet 3)
  monitoring?: WorkingPaperRiskMonitoring;
  monitoring_p?: number;
  monitoring_d?: number;
  monitoring_bobot?: number;
  monitoring_nilai?: number;
  monitoring_inherent_score?: number;
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
  inherentScore?: number;
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
  target_score?: number;
  target_tingkat_risiko?: string;
  target_tingkat_risiko_display?: string;
  mitigations?: string[];
  mitigation_due_dates?: string[];
  mitigation_details?: string[];
}

export interface WorkingPaperRiskLink {
  id: string;
  working_paper_id: string;
  risk_id: string;
  sort_order: number;
  source_mode: WorkingPaperRiskSourceMode;
  created_at: string;
  risk: WorkingPaperRiskData;
  version_group_id?: string;
  source_risk_id?: string;
  monitoring_id?: string;
  result_risk_id?: string;
  result_risk?: WorkingPaperRiskData;
  roster_status?: WorkingPaperRosterStatus;
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
  sequence_no: number;
  code: string;
  title: string;
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
  tte_skipped: boolean;
  signatories: WorkingPaperSignatory[];
}

export interface WorkingPaperSigningBlocker {
  version_group_id?: string;
  code: string;
  title: string;
  monitoring_status: string;
}

export interface CreateSignatoryInput {
  user_id: string;
  sequence_no: number;
  signer_name: string;
  signer_nip?: string;
  signer_jabatan: string;
  signer_pangkat: string;
}

export type WorkingPaperRosterStatus =
  | "finalized_result"
  | "existing_draft"
  | "draft_will_be_created";

export interface WorkingPaperRosterEntry {
  versionGroupId: string;
  code: string;
  title: string;
  organizationId: string;
  sourceRiskId: string;
  sourceVersionNumber: number;
  resultRiskId?: string;
  resultVersionNumber?: number;
  monitoringId?: string;
  monitoringCycle: string;
  monitoringStatus: string;
  rosterStatus: WorkingPaperRosterStatus;
}

export interface WorkingPaperRosterPreview {
  organizationId: string;
  assessmentCycle: string;
  monitoringCycle: string;
  revision: string;
  entries: WorkingPaperRosterEntry[];
  summary: {
    eligibleCount: number;
    finalizedCount: number;
    existingDraftCount: number;
    newDraftCount: number;
  };
}

export interface WorkingPaperRosterDecisionInput {
  version_group_id: string;
  included: boolean;
  exclusion_reason?: string;
}

export interface CreateWorkingPaperRequest {
  organization_id: string;
  assessment_cycle: string;
  roster_revision: string;
  roster_decisions: WorkingPaperRosterDecisionInput[];
  signatories: CreateSignatoryInput[];
}

export interface WorkingPaperSigningBlocker {
  version_group_id?: string;
  code: string;
  title: string;
  monitoring_status: string;
}

export interface WorkingPaperListResponse {
  data: WorkingPaper[];
  total: number;
  page: number;
  limit: number;
}
