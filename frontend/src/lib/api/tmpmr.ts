import { api } from "@/lib/api";
import type {
  ListTMPMRParams,
  PaginatedTMPMRResponse,
  ReviewTMPMRRequest,
  TMPMRAssessment,
  UpsertTMPMRRequest,
} from "@/types/tmpmr";

function buildTMPMRQuery(params?: ListTMPMRParams) {
  const searchParams = new URLSearchParams();

  if (params?.organizationId) {
    searchParams.set("organization_id", params.organizationId);
  }
  if (params?.period) {
    searchParams.set("period", params.period);
  }
  if (params?.status) {
    searchParams.set("status", params.status);
  }
  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params?.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  return searchParams.toString();
}

export async function listTMPMRAssessments(
  token: string,
  params?: ListTMPMRParams,
): Promise<PaginatedTMPMRResponse> {
  const qs = buildTMPMRQuery(params);
  return api.get<PaginatedTMPMRResponse>(`/tmpmr${qs ? `?${qs}` : ""}`, token);
}

export async function createTMPMRAssessment(
  token: string,
  payload: UpsertTMPMRRequest,
): Promise<TMPMRAssessment> {
  return api.post<TMPMRAssessment>("/tmpmr", payload, token);
}

export async function getTMPMRAssessment(
  token: string,
  id: string,
): Promise<TMPMRAssessment> {
  return api.get<TMPMRAssessment>(`/tmpmr/${id}`, token);
}

export async function updateTMPMRAssessment(
  token: string,
  id: string,
  payload: UpsertTMPMRRequest,
): Promise<TMPMRAssessment> {
  return api.put<TMPMRAssessment>(`/tmpmr/${id}`, payload, token);
}

export async function submitTMPMRAssessment(
  token: string,
  id: string,
): Promise<TMPMRAssessment> {
  return api.post<TMPMRAssessment>(`/tmpmr/${id}/submit`, {}, token);
}

export async function reviewTMPMRAssessment(
  token: string,
  id: string,
  payload: ReviewTMPMRRequest,
): Promise<TMPMRAssessment> {
  return api.post<TMPMRAssessment>(`/tmpmr/${id}/review`, payload, token);
}

export async function approveTMPMRAssessment(
  token: string,
  id: string,
): Promise<TMPMRAssessment> {
  return api.post<TMPMRAssessment>(`/tmpmr/${id}/approve`, {}, token);
}
