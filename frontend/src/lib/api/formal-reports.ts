import { api, ApiError, API_BASE } from "@/lib/api";
import { downloadBlob } from "@/lib/risk-export";
import type {
  FormalReport,
  GenerateFormalReportRequest,
  ListFormalReportsParams,
  PaginatedFormalReportResponse,
} from "@/types/formal-report";

function buildFormalReportsQuery(params?: ListFormalReportsParams) {
  const searchParams = new URLSearchParams();

  if (params?.organizationId) {
    searchParams.set("organization_id", params.organizationId);
  }
  if (params?.period) {
    searchParams.set("period", params.period);
  }
  if (params?.reportType) {
    searchParams.set("report_type", params.reportType);
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

export async function listFormalReports(
  token: string,
  params?: ListFormalReportsParams,
): Promise<PaginatedFormalReportResponse> {
  const qs = buildFormalReportsQuery(params);
  return api.get<PaginatedFormalReportResponse>(
    `/formal-reports${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function generateFormalReport(
  token: string,
  payload: GenerateFormalReportRequest,
): Promise<FormalReport> {
  return api.post<FormalReport>("/formal-reports/generate", payload, token);
}

export async function getFormalReport(
  token: string,
  id: string,
): Promise<FormalReport> {
  return api.get<FormalReport>(`/formal-reports/${id}`, token);
}

function buildFormalReportDownloadUrl(downloadUrl: string) {
  const normalizedPath = downloadUrl.startsWith("/api/v1")
    ? downloadUrl.slice("/api/v1".length)
    : downloadUrl;

  return `${API_BASE}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

function parseFilenameFromContentDisposition(value: string | null) {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = value.match(/filename=\"?([^\";]+)\"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
}

export async function downloadFormalReport(
  token: string,
  downloadUrl: string,
  fallbackFilename: string,
) {
  const response = await fetch(buildFormalReportDownloadUrl(downloadUrl), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(
      detail ||
        response.statusText ||
        "Gagal mengunduh laporan Monitoring & Evaluasi.",
      response.status,
    );
  }

  const blob = await response.blob();
  const filename =
    parseFilenameFromContentDisposition(
      response.headers.get("Content-Disposition"),
    ) ?? fallbackFilename;

  downloadBlob(blob, filename);
}
