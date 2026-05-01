import { api } from "@/lib/api";
import type { ImpactCriteria } from "@/types/impact-criteria";

export interface ListImpactCriteriaParams {
  category?: string;
  uprLevel?: string;
  impactLevel?: number;
}

export async function listImpactCriteria(
  token: string,
  params?: ListImpactCriteriaParams
): Promise<ImpactCriteria[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.uprLevel) searchParams.set("uprLevel", params.uprLevel);
  if (params?.impactLevel !== undefined) {
    searchParams.set("impactLevel", String(params.impactLevel));
  }

  const qs = searchParams.toString();
  const res = await api.get<{ data: ImpactCriteria[]; total: number }>(
    `/impact-criteria${qs ? `?${qs}` : ""}`,
    token
  );
  return res.data;
}