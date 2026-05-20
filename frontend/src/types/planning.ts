export interface PlanningROOption {
  roId: string;
  roTitle: string;
  kegiatanTitle: string;
  programTitle: string;
  ikuTitle: string;
  sasaranTitle: string;
  tujuanTitle: string;
  period: string;
}

export interface PlanningROOptionsResponse {
  data: PlanningROOption[];
}

export interface PlanningObjectiveCompatibilityItem {
  id: string;
  organizationId: string;
  period: string;
  tujuan: string;
  sasaran: string;
  indikatorKinerjaUtama: string;
  target: string;
  program: string;
  kegiatan: string;
  processBusiness: string;
  status: string;
}

export interface PlanningObjectiveCompatibilityResponse {
  data: PlanningObjectiveCompatibilityItem[];
  total: number;
  page: number;
  limit: number;
}
