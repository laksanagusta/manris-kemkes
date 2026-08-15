import { api } from "@/lib/api";
import type {
  Risk,
  RiskMitigation,
  RiskStatus,
} from "@/types/risk";
import type { StartMonitoringResponse } from "@/lib/api/risk-monitoring";

export interface RiskAssessmentUpdateData {
  title?: string;
  description?: string;
  category?: string;
  status?: RiskStatus | string;
  unitId?: string;
  organizationId?: string;
  cause?: string[];
  riskSource?: string;
  controllability?: string;
  impactDesc?: string[];
  existingControl?: string;
  controlEffectiveness?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number;
  inherentScore?: number;
  inherent_score?: number;
  riskPriority?: number;
  riskAppetite?: string;
  treatmentOption?: string;
  mitigations?: RiskMitigation[];
  targetProbability?: number;
  targetImpact?: number;
  targetWeight?: number;
  targetNilai?: number;
  targetScore?: number;
  nextReviewDate?: string | null;
  reviewScheduleText?: string;
  assessmentCycle?: string;
  reviewType?: string;
  change_reason?: string;
  changeReason?: string;
  review_summary?: string;
  reviewSummary?: string;
  draftApprovalLine?: Array<{
    id: string;
    name: string;
    type?: string;
  }>;
  objectiveId?: string | null;
  roId?: string | null;
}

export interface RiskAssessmentUpdateResponse {
  id: string;
  code: string;
  message: string;
  updatedAt: string;
  warnings?: string[];
}

export interface ListApprovedRisksParams {
  q?: string;
  assessment_cycle?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedRiskResponse {
  data: Risk[];
  total: number;
  page: number;
  limit: number;
}

export function getCurrentCycle(): string {
  const month = new Date().getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  const half = "Q" + quarter;
  return `${new Date().getFullYear()}-${half}`;
}

export function formatCycleLabel(cycle: string): string {
  const [year, quarter] = cycle.split("-");
  return `Kuartal ${quarter?.replace("Q", "") ?? "-"}, ${year}`;
}

export async function listApprovedRisks(
  token: string,
  params?: ListApprovedRisksParams,
): Promise<Risk[]> {
  const searchParams = new URLSearchParams();

  if (params?.q) searchParams.set("q", params.q);
  if (params?.assessment_cycle) {
    searchParams.set("assessment_cycle", params.assessment_cycle);
  }
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const qs = searchParams.toString();

  const result = await api.get<Risk[] | { data: Risk[] }>(
    `/risks/trend${qs ? `?${qs}` : ""}`,
    token,
  );

  // Handle both unwrapped array and wrapped {data: [...]} responses
  if (Array.isArray(result)) return result;
  if (result && "data" in result) return result.data;
  return [];
}

/** @deprecated Profile revisions are created only inside monitoring. */
export async function createReassessmentDraft(
  token: string,
  riskId: string,
  cycle: string,
): Promise<StartMonitoringResponse> {
  return api.post<StartMonitoringResponse>(
    `/risks/${riskId}/monitorings`,
    { cycle },
    token,
  );
}

export async function getRiskDetail(
  token: string,
  riskId: string,
): Promise<Risk> {
  return api.get<Risk>(`/risks/${riskId}`, token);
}

export async function updateRiskAssessment(
  token: string,
  riskId: string,
  data: RiskAssessmentUpdateData,
): Promise<RiskAssessmentUpdateResponse> {
  return api.put<RiskAssessmentUpdateResponse>(
    `/risks/${riskId}`,
    data,
    token,
  );
}
