import { api } from "./api";
import type {
  CreateMeetingMinuteResult,
  MeetingMinute,
  MeetingMinuteWithRisks,
  CreateMeetingMinuteInput,
  ListMeetingMinutesOptions,
  MeetingMinutesRisk,
} from "@/types/meeting-minute";

export async function createMeetingMinute(
  input: CreateMeetingMinuteInput,
  token: string
): Promise<CreateMeetingMinuteResult> {
  return api.post<CreateMeetingMinuteResult>("/meeting-minutes", input, token);
}

export async function getMeetingMinute(
  id: string,
  token: string
): Promise<MeetingMinuteWithRisks> {
  return api.get<MeetingMinuteWithRisks>(`/meeting-minutes/${id}`, token);
}

export async function listMeetingMinutes(
  options: ListMeetingMinutesOptions,
  token: string
): Promise<{ items: MeetingMinute[]; total: number }> {
  const params = new URLSearchParams();
  if (options.organizationId) params.set("organizationId", options.organizationId);
  if (options.createdBy) params.set("createdBy", options.createdBy);
  if (options.riskId) params.set("riskId", options.riskId);
  if (options.createdAt) params.set("created_at", options.createdAt);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  return api.get<{ items: MeetingMinute[]; total: number }>(
    `/meeting-minutes?${params.toString()}`,
    token
  );
}

export async function linkRisksToMeetingMinute(
  meetingId: string,
  riskIds: string[],
  token: string
): Promise<void> {
  await api.post(`/meeting-minutes/${meetingId}/risks`, { riskIds }, token);
}

export async function unlinkRisksFromMeetingMinute(
  meetingId: string,
  riskIds: string[],
  token: string
): Promise<void> {
  await api.delete(`/meeting-minutes/${meetingId}/risks`, { riskIds }, token);
}

export async function getMeetingMinutesByRisk(
  riskId: string,
  token: string
): Promise<MeetingMinutesRisk[]> {
  return api.get<MeetingMinutesRisk[]>(
    `/risks/${riskId}/meeting-minutes`,
    token
  );
}

export async function deleteMeetingMinute(id: string, token: string): Promise<void> {
  await api.delete(`/meeting-minutes/${id}`, undefined, token);
}
