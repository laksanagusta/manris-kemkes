import { api } from "@/lib/api";
import type { MitigationTask, MonitoringValidationResult } from "@/types/risk";

export function getMitigationTask(token: string, taskId: string): Promise<MitigationTask> {
  return api.get<MitigationTask>(`/mitigation-tasks/${encodeURIComponent(taskId)}`, token);
}

export async function listMonitoringTasks(
  token: string,
  monitoringId: string,
): Promise<MitigationTask[]> {
  const res = await api.get<MitigationTask[]>(
    `/risk-monitorings/${monitoringId}/tasks`,
    token,
  );
  return res ?? [];
}

export async function validateMonitoringFinalize(
  token: string,
  monitoringId: string,
): Promise<MonitoringValidationResult> {
  const res = await api.get<MonitoringValidationResult>(
    `/risk-monitorings/${monitoringId}/validate-finalize`,
    token,
  );
  return res;
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
  const res = await api.put<MitigationTask>(
    `/mitigation-tasks/${taskId}/report`,
    data,
    token,
  );
  return res;
}

export interface ScopedTaskPage {
  data: MitigationTask[];
  total: number;
  page: number;
  limit: number;
  summary: { total: number; done: number; pending: number; overdue: number; notReported: number };
}

export function listScopedTaskPage(
  token: string,
  scope: { riskId?: string; monitoringId?: string },
  params: { page: number; limit: number; mitigationId?: string },
): Promise<ScopedTaskPage> {
  const path = scope.monitoringId
    ? `/risk-monitorings/${encodeURIComponent(scope.monitoringId)}/tasks`
    : `/risks/${encodeURIComponent(scope.riskId || "")}/tasks`;
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.mitigationId && params.mitigationId !== "all") query.set("mitigation_id", params.mitigationId);
  return api.get<ScopedTaskPage>(`${path}?${query}`, token);
}
