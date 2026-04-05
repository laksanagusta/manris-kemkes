import { api } from "@/lib/api";
import type { CommunicationLog, CreateCommunicationLogInput } from "@/types/communication-log";

export async function getCommunicationLogs(riskId: string, token: string): Promise<CommunicationLog[]> {
  return api.get<CommunicationLog[]>(`/risks/${riskId}/communication-logs`, token);
}

export async function createCommunicationLog(
  riskId: string,
  input: CreateCommunicationLogInput,
  token: string
): Promise<CommunicationLog> {
  return api.post<CommunicationLog>(`/risks/${riskId}/communication-logs`, input, token);
}

export async function deleteCommunicationLog(id: string, token: string): Promise<void> {
  return api.delete(`/communication-logs/${id}`, undefined, token);
}