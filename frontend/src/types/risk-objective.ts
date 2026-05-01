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
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}