import { api } from "@/lib/api";
import type {
  WorkingPaper,
  CreateWorkingPaperRequest,
  WorkingPaperListResponse,
  WorkingPaperRosterPreview,
} from "@/types/working-paper";

export async function listWorkingPapers(
  token: string,
  params?: {
    status?: string;
    q?: string;
    assessment_cycle?: string;
    created_at?: string;
    page?: number;
    limit?: number;
  },
): Promise<WorkingPaperListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.q) searchParams.set("q", params.q);
  if (params?.assessment_cycle) {
    searchParams.set("assessment_cycle", params.assessment_cycle);
  }
  if (params?.created_at) searchParams.set("created_at", params.created_at);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const qs = searchParams.toString();
  return api.get<WorkingPaperListResponse>(`/working-papers${qs ? `?${qs}` : ""}`, token);
}

export async function listWorkingPaperAssessmentCycles(
  token: string,
): Promise<string[]> {
  const pageSize = 100;
  const firstPage = await listWorkingPapers(token, { page: 1, limit: pageSize });
  const cycles = new Set<string>();
  for (const paper of firstPage.data) {
    const cycle = paper.assessment_cycle?.trim();
    if (cycle) cycles.add(cycle);
  }
  const pageCount = Math.ceil(firstPage.total / pageSize);

  for (let startPage = 2; startPage <= pageCount; startPage += 5) {
    const pages = Array.from(
      { length: Math.min(5, pageCount - startPage + 1) },
      (_, index) => startPage + index,
    );
    const responses = await Promise.all(
      pages.map((page) =>
        listWorkingPapers(token, { page, limit: pageSize }),
      ),
    );

    for (const response of responses) {
      for (const paper of response.data) {
        const cycle = paper.assessment_cycle?.trim();
        if (cycle) cycles.add(cycle);
      }
    }
  }

  return [...cycles];
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

export async function previewWorkingPaperRoster(
  organizationId: string,
  assessmentCycle: string,
  token: string,
): Promise<WorkingPaperRosterPreview> {
  const params = new URLSearchParams({
    organization_id: organizationId,
    assessment_cycle: assessmentCycle,
  });
  return api.get<WorkingPaperRosterPreview>(`/working-papers/roster-preview?${params}`, token);
}

export async function deleteWorkingPaper(id: string, token: string): Promise<void> {
  return api.delete<void>(`/working-papers/${id}`, undefined, token);
}

export async function signWorkingPaper(id: string, token: string): Promise<WorkingPaper> {
  return api.post<WorkingPaper>(`/working-papers/${id}/sign`, {}, token);
}

export async function startSigningWorkingPaper(id: string, token: string): Promise<WorkingPaper> {
  return api.post<WorkingPaper>(`/working-papers/${id}/start-signing`, {}, token);
}

export async function cancelWorkingPaper(id: string, token: string): Promise<void> {
  return api.post<void>(`/working-papers/${id}/cancel`, {}, token);
}

export async function skipTTEWorkingPaper(id: string, token: string): Promise<WorkingPaper> {
  return api.post<WorkingPaper>(`/working-papers/${id}/skip-tte`, {}, token);
}
