import { api } from "@/lib/api";
import type {
  PlanningROOption,
  PlanningObjectiveCompatibilityResponse,
  PlanningROOptionsResponse,
} from "@/types/planning";

export type ListPlanningROOptionsParams = {
  organization_id: string;
  period: string;
  q?: string;
};

export type ListPlanningObjectiveCompatibilityParams = {
  organization_id?: string;
  period?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export function buildPlanningROOptionsQuery(params?: ListPlanningROOptionsParams) {
  const search = new URLSearchParams();
  if (!params) return "";
  search.set("organization_id", params.organization_id);
  search.set("period", params.period);
  if (params.q) search.set("q", params.q);
  return search.toString();
}

export function buildPlanningObjectiveCompatibilityQuery(
  params?: ListPlanningObjectiveCompatibilityParams,
) {
  const search = new URLSearchParams();
  if (!params) return "";
  if (params.organization_id) search.set("organization_id", params.organization_id);
  if (params.period) search.set("period", params.period);
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  return search.toString();
}

export async function listPlanningROOptions(
  token: string,
  params: ListPlanningROOptionsParams,
): Promise<PlanningROOptionsResponse> {
  const qs = buildPlanningROOptionsQuery(params);
  const response = await api.get<PlanningROOption[] | PlanningROOptionsResponse>(
    `/planning/ros?${qs}`,
    token,
  );
  if (Array.isArray(response)) {
    return { data: response };
  }
  return response;
}

export async function listPlanningObjectiveCompatibility(
  token: string,
  params?: ListPlanningObjectiveCompatibilityParams,
): Promise<PlanningObjectiveCompatibilityResponse> {
  const qs = buildPlanningObjectiveCompatibilityQuery(params);
  return api.get<PlanningObjectiveCompatibilityResponse>(
    `/planning/objectives${qs ? `?${qs}` : ""}`,
    token,
  );
}
