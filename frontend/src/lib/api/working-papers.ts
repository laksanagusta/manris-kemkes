import { api } from "@/lib/api";
import type {
  WorkingPaper,
  CreateWorkingPaperRequest,
  WorkingPaperListResponse,
} from "@/types/working-paper";

export async function listWorkingPapers(
  token: string,
  params?: { status?: string; page?: number; limit?: number },
): Promise<WorkingPaperListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return api.get<WorkingPaperListResponse>(`/working-papers${qs ? `?${qs}` : ""}`, token);
}

export async function getWorkingPaper(id: string, token: string): Promise<WorkingPaper> {
  return api.get<WorkingPaper>(`/working-papers/${id}`, token);
}

export async function createWorkingPaper(
  data: CreateWorkingPaperRequest,
  token: string,
): Promise<WorkingPaper> {
  return api.post<WorkingPaper>("/working-papers", data, token);
}

export async function deleteWorkingPaper(id: string, token: string): Promise<void> {
  return api.delete<void>(`/working-papers/${id}`, undefined, token);
}

export async function signWorkingPaper(id: string, token: string): Promise<WorkingPaper> {
  return api.post<WorkingPaper>(`/working-papers/${id}/sign`, {}, token);
}

export async function cancelWorkingPaper(id: string, token: string): Promise<void> {
  return api.post<void>(`/working-papers/${id}/cancel`, {}, token);
}

export async function getPendingSigningCount(
  token: string,
): Promise<{ count: number }> {
  return api.get<{ count: number }>("/working-papers/pending-count", token);
}
