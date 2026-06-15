import { api } from "@/lib/api";
import type { MitigationTask, MonitoringValidationResult } from "@/types/risk";

export async function listMonitoringTasks(
  token: string,
  monitoringId: string,
): Promise<MitigationTask[]> {
  const res = await api.get<{ data: MitigationTask[] }>(
    `/risk-monitorings/${monitoringId}/tasks`,
    token,
  );
  return res.data ?? [];
}

export async function validateMonitoringFinalize(
  token: string,
  monitoringId: string,
): Promise<MonitoringValidationResult> {
  const res = await api.get<{ data: MonitoringValidationResult }>(
    `/risk-monitorings/${monitoringId}/validate-finalize`,
    token,
  );
  return res.data;
}

export async function updateTaskReport(
  token: string,
  taskId: string,
  data: {
    status?: string;
    reportOutput?: string;
    reportObstacle?: string;
    evidenceUrl?: string;
    notes?: string;
  },
): Promise<MitigationTask> {
  const res = await api.put<{ data: MitigationTask }>(
    `/mitigation-tasks/${taskId}/report`,
    data,
    token,
  );
  return res.data;
}
