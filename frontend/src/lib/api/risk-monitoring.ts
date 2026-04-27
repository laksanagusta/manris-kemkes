import { api } from "@/lib/api";
import type {
  MonitoringBatchPayload,
  MonitoringBatchResponse,
  MonitoringPreviewResponse,
} from "@/types/risk-monitoring";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * Download monitoring template XLSX
 * GET /risks/batch/monitoring/template?organization_id=X&cycle=YYYY-HN
 */
export async function downloadMonitoringTemplate(
  token: string,
  orgId: string,
  cycle: string
): Promise<Blob> {
  const query = new URLSearchParams({
    organization_id: orgId,
    cycle,
  });
  const response = await fetch(
    `${API_BASE}/risks/batch/monitoring/template?${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new Error("Gagal mengunduh template pemantauan.");
  }
  return response.blob();
}

/**
 * Upload and preview monitoring template
 * POST /risks/batch/monitoring/preview?organization_id=X&cycle=YYYY-HN
 */
export async function previewMonitoringUpload(
  file: File,
  token: string,
  orgId: string,
  cycle: string
): Promise<MonitoringPreviewResponse> {
  const form = new FormData();
  form.append("file", file);
  const query = new URLSearchParams({
    organization_id: orgId,
    cycle,
  });
  return api.postForm<MonitoringPreviewResponse>(
    `/risks/batch/monitoring/preview?${query}`,
    form,
    token
  );
}

/**
 * Submit monitoring batch (create reassessment drafts)
 * POST /risks/batch/monitoring?organization_id=X
 */
export async function submitMonitoringBatch(
  items: MonitoringBatchPayload[],
  token: string,
  orgId: string,
  cycle: string
): Promise<MonitoringBatchResponse> {
  return api.post<MonitoringBatchResponse>(
    `/risks/batch/monitoring?organization_id=${orgId}&cycle=${cycle}`,
    { items },
    token
  );
}
