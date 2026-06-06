import { API_BASE, ApiError, api } from "@/lib/api";
import { downloadBlob } from "@/lib/risk-export";
import type {
  CreateEvaluationRequest,
  Evaluation,
  ListEvaluationsParams,
  PaginatedEvaluationResponse,
  UpdateEvaluationRequest,
} from "@/types/evaluation";

function buildEvaluationQuery(params?: ListEvaluationsParams) {
  const searchParams = new URLSearchParams();

  if (params?.organizationId) searchParams.set("organization_id", params.organizationId);
  if (params?.organizationGroupId) {
    searchParams.set("organization_group_id", params.organizationGroupId);
  }
  if (params?.period) searchParams.set("period", params.period);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.query) searchParams.set("query", params.query);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  return searchParams.toString();
}

function buildEvaluationDownloadUrl(id: string) {
  return `${API_BASE}/evaluations/${id}/export/pdf`;
}

function parseFilenameFromContentDisposition(value: string | null) {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
}

export async function listEvaluations(
  token: string,
  params?: ListEvaluationsParams,
): Promise<PaginatedEvaluationResponse> {
  const qs = buildEvaluationQuery(params);
  return api.get<PaginatedEvaluationResponse>(
    `/evaluations${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function createEvaluation(
  token: string,
  payload: CreateEvaluationRequest,
): Promise<Evaluation> {
  return api.post<Evaluation>("/evaluations", payload, token);
}

export async function getEvaluation(token: string, id: string): Promise<Evaluation> {
  return api.get<Evaluation>(`/evaluations/${id}`, token);
}

export async function updateEvaluation(
  token: string,
  id: string,
  payload: UpdateEvaluationRequest,
): Promise<Evaluation> {
  return api.put<Evaluation>(`/evaluations/${id}`, payload, token);
}

export async function finalizeEvaluation(token: string, id: string): Promise<Evaluation> {
  return api.post<Evaluation>(`/evaluations/${id}/finalize`, {}, token);
}

export async function reopenEvaluation(token: string, id: string): Promise<Evaluation> {
  return api.post<Evaluation>(`/evaluations/${id}/reopen`, {}, token);
}

export async function downloadEvaluationPdf(
  token: string,
  id: string,
  fallbackFilename = `evaluasi-mr-${id}.pdf`,
): Promise<void> {
  const response = await fetch(buildEvaluationDownloadUrl(id), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(
      detail || response.statusText || "Gagal mengunduh laporan evaluasi.",
      response.status,
    );
  }

  const blob = await response.blob();
  const filename =
    parseFilenameFromContentDisposition(response.headers.get("Content-Disposition")) ??
    fallbackFilename;

  downloadBlob(blob, filename);
}
