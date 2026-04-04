import { api } from "@/lib/api";
import type {
  Form,
  FormResponse,
  FormAnalyticsSummary,
  CreateFormDTO,
  UpdateFormDTO,
  PublishFormDTO,
  SubmitResponseDTO,
} from "@/types/form";

export async function fetchForms(
  token: string,
  filters?: { status?: string },
): Promise<Form[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return api.get<Form[]>(`/forms${qs ? `?${qs}` : ""}`, token);
}

export async function fetchForm(id: string, token: string): Promise<Form> {
  return api.get<Form>(`/forms/${id}`, token);
}

export async function createForm(
  data: CreateFormDTO,
  token: string,
): Promise<{ id: string }> {
  return api.post<{ id: string }>("/forms", data, token);
}

export async function updateForm(
  id: string,
  data: UpdateFormDTO,
  token: string,
): Promise<void> {
  return api.put<void>(`/forms/${id}`, data, token);
}

export async function deleteForm(id: string, token: string): Promise<void> {
  return api.delete<void>(`/forms/${id}`, undefined, token);
}

export async function publishForm(
  id: string,
  data: PublishFormDTO,
  token: string,
): Promise<void> {
  return api.post<void>(`/forms/${id}/publish`, data, token);
}

export async function closeForm(id: string, token: string): Promise<void> {
  return api.post<void>(`/forms/${id}/close`, {}, token);
}

export async function submitResponse(
  formId: string,
  data: SubmitResponseDTO,
  token: string,
): Promise<void> {
  return api.post<void>(`/forms/${formId}/responses`, data, token);
}

export async function fetchFormResponses(
  formId: string,
  token: string,
): Promise<FormResponse[]> {
  return api.get<FormResponse[]>(`/forms/${formId}/responses`, token);
}

export async function fetchFormAnalytics(
  formId: string,
  token: string,
): Promise<FormAnalyticsSummary> {
  return api.get<FormAnalyticsSummary>(`/forms/${formId}/analytics`, token);
}

export async function fetchMyForms(token: string): Promise<Form[]> {
  return api.get<Form[]>("/forms/mine", token);
}
