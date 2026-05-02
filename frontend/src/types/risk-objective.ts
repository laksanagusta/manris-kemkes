export type RiskObjectiveStatus = "draft" | "in_review" | "approved" | "archived";

export interface RiskObjective {
  id: string;
  organizationId: string;
  charterId?: string;
  period: string;
  tujuan: string;
  sasaran: string;
  indikatorKinerjaUtama: string;
  target: string;
  program: string;
  kegiatan: string;
  processBusiness: string;
  status: RiskObjectiveStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
