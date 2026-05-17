import { API_BASE, ApiError } from "@/lib/api";
import { downloadBlob } from "@/lib/risk-export";

function buildRiskDetailPDFDownloadUrl(riskId: string) {
  return `${API_BASE}/risks/${riskId}/export-pdf`;
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

export async function downloadRiskDetailPDF(
  token: string,
  riskId: string,
  fallbackFilename: string,
) {
  const response = await fetch(buildRiskDetailPDFDownloadUrl(riskId), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(
      detail || response.statusText || "PDF belum berhasil dibuat.",
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
