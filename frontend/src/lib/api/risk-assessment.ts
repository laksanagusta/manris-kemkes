import { api } from "@/lib/api";
import type { Risk, RiskStatus } from "@/types/risk";

export interface RiskAssessmentUpdateData {
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number;
  inherent_score?: number;
  change_reason?: string;
  review_summary?: string;
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
  const half = month <= 6 ? "H1" : "H2";
  return `${new Date().getFullYear()}-${half}`;
}

export function formatCycleLabel(cycle: string): string {
  const [year, half] = cycle.split("-");
  const semester = half === "H1" ? "1" : "2";
  return `Semester ${semester}, ${year}`;
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

export async function createReassessmentDraft(
  token: string,
  riskId: string,
  cycle: string,
): Promise<Risk> {
  return api.post<Risk>(
    `/risks/${riskId}/reassess`,
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
  data: RiskAssessmentUpdateData & Record<string, unknown>,
): Promise<Risk> {
  return api.put<Risk>(
    `/risks/${riskId}`,
    data,
    token,
  );
}
