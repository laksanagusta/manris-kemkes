export interface PlanningROOption {
  roId: string;
  roTitle: string;
  activityTitle?: string;
  programTitle?: string;
  ikuTitle?: string;
  objectiveTitle?: string;
  planningId?: string;
  planningTitle?: string;
  planningStatus?: string;
  planningPeriod?: string;
  kegiatanTitle?: string;
  sasaranTitle?: string;
  tujuanTitle?: string;
  period?: string;
}

export interface PlanningROOptionsResponse {
  data: PlanningROOption[];
}

export interface PlanningObjectiveCompatibilityItem {
  id: string;
  organizationId: string;
  period: string;
  planningId?: string;
  planningTitle?: string;
  planningStatus?: string;
  planningPeriod?: string;
  objectiveTitle?: string;
  indicatorTitle?: string;
  target?: string;
  program?: string;
  activityTitle?: string;
  processBusiness?: string;
  status?: string;
  tujuan?: string;
  sasaran?: string;
  indikatorKinerjaUtama?: string;
  kegiatan?: string;
}

export interface PlanningObjectiveCompatibilityResponse {
  data: PlanningObjectiveCompatibilityItem[];
  total: number;
  page: number;
  limit: number;
}
