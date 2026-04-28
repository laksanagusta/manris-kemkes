import { api } from "@/lib/api";
import type { RiskCategory, RiskStatus } from "@/types/risk";

export type RiskRegisterStatusFilter = "all" | Exclude<RiskStatus, "assessment_draft">;
export type RiskRegisterLifecycleFilter = "active" | "archived" | "all";
export type RiskRegisterCategoryFilter = "all" | Exclude<RiskCategory, "">;

export interface RiskRegisterListItem {
  id: string;
  code?: string;
  title?: string;
  description?: string;
  category?: RiskCategory | "";
  status?: RiskStatus;
  organizationId?: string;
  orgName?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number;
  inherentScore?: number;
  targetProbability?: number;
  targetImpact?: number;
  targetWeight?: number;
  targetNilai?: number;
  cause?: string[];
  impactDesc?: string[];
  existingControl?: string;
  treatmentOption?: string;
  nextReviewDate?: string;
  reviewScheduleText?: string;
  versionGroupId?: string;
  versionNumber?: number;
  previousRiskId?: string | null;
  isCurrent?: boolean;
  assessmentCycle?: string;
  reviewType?: string;
  changeReason?: string;
  draftId?: string | null;
  draftStatus?: RiskStatus | null;
  hasOngoing?: boolean;
  archivedAt?: string | null;
  archivedReason?: string;
}

export interface PaginatedRiskRegisterResponse {
  data: RiskRegisterListItem[];
  total: number;
  page: number;
  limit: number;
}

interface ListRiskRegisterParams {
   q?: string;
   lifecycle?: RiskRegisterLifecycleFilter;
   status?: Exclude<RiskStatus, "assessment_draft">;
   category?: Exclude<RiskCategory, "">;
   assessment_cycle?: string;
   created_at?: string;
   sort_by?: string;
   sort_order?: "asc" | "desc";
   page?: number;
   limit?: number;
 }

export async function listRiskRegister(
  token: string,
  params?: ListRiskRegisterParams,
): Promise<PaginatedRiskRegisterResponse> {
  const searchParams = new URLSearchParams();

  if (params?.q) searchParams.set("q", params.q);
  if (params?.lifecycle && params.lifecycle !== "active") {
    searchParams.set("lifecycle", params.lifecycle);
  }
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.assessment_cycle) {
    searchParams.set("assessment_cycle", params.assessment_cycle);
  }
  if (params?.created_at) searchParams.set("created_at", params.created_at);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const qs = searchParams.toString();

  return api.get<PaginatedRiskRegisterResponse>(
    `/risks/register${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function archiveRisk(
  token: string,
  riskId: string,
  payload: { reason: string; note?: string },
) {
  return api.post<{
    message: string;
    archivedAt?: string | null;
    archivedReason?: string;
  }>(`/risks/${riskId}/archive`, payload, token);
}

export async function restoreRisk(token: string, riskId: string) {
  return api.post<{ message: string }>(`/risks/${riskId}/restore`, {}, token);
}
