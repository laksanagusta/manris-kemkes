import { API_BASE, ApiError } from "@/lib/api";
import type { AgentAttachment, AgentConversation, AgentConversationDetail, AgentOperation, AgentProposal, AgentRun, AgentSendInput, AgentSkill } from "@/types/agent";

async function responseFor(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  const multipart = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}/agent${path}`, {
    ...options, cache: "no-store", headers: {
      ...(multipart ? {} : { "Content-Type": "application/json" }), Authorization: `Bearer ${token}`, ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      try { localStorage.removeItem("manris_token"); } catch { /* Redirect still restores a valid session when storage is unavailable. */ }
      window.location.href = "/login";
      return new Promise<Response>(() => {});
    }
    const body = await response.json().catch(() => ({}));
    const message = typeof body.detail === "string" ? body.detail : typeof body.error === "string" ? body.error : "Permintaan belum berhasil. Silakan coba lagi.";
    throw new ApiError(message, response.status);
  }
  return response;
}
async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await responseFor(path, token, options);
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  return body.data as T;
}
const route = (id: string) => `/conversations/${encodeURIComponent(id)}`;
export const agentApi = {
  skills: (token: string, signal?: AbortSignal) => request<AgentSkill[]>("/skills", token, { signal }),
  conversations: (token: string, signal?: AbortSignal) => request<AgentConversation[]>("/conversations", token, { signal }),
  create: (token: string) => request<AgentConversation>("/conversations", token, { method: "POST", body: "{}" }),
  detail: (id: string, token: string, signal?: AbortSignal) => request<AgentConversationDetail>(route(id), token, { signal }),
  send: (id: string, input: AgentSendInput, token: string) => request<AgentRun>(`${route(id)}/messages`, token, { method: "POST", body: JSON.stringify(input) }),
  upload: (id: string, file: File, idempotencyKey: string, token: string) => {
    const form = new FormData(); form.append("file", file); form.append("idempotencyKey", idempotencyKey);
    return request<AgentAttachment>(`${route(id)}/attachments`, token, { method: "POST", body: form });
  },
  cancel: (id: string, runId: string, token: string) => request<void>(`${route(id)}/runs/${encodeURIComponent(runId)}/cancel`, token, { method: "POST", body: "{}" }),
  update: (id: string, proposalId: string, revision: number, operations: AgentOperation[], token: string) => request<AgentProposal>(`${route(id)}/proposals/${encodeURIComponent(proposalId)}`, token, { method: "PUT", body: JSON.stringify({ revision, operations }) }),
  apply: (id: string, proposalId: string, revision: number, idempotencyKey: string, token: string) => request<AgentProposal>(`${route(id)}/proposals/${encodeURIComponent(proposalId)}/apply`, token, { method: "POST", body: JSON.stringify({ revision, idempotencyKey }) }),
  reject: (id: string, proposalId: string, revision: number, token: string) => request<AgentProposal>(`${route(id)}/proposals/${encodeURIComponent(proposalId)}/reject`, token, { method: "POST", body: JSON.stringify({ revision }) }),
  download: async (id: string, messageId: string, format: "xlsx" | "pdf", token: string) => {
    const response = await responseFor(`${route(id)}/messages/${encodeURIComponent(messageId)}/export?format=${format}`, token);
    const candidate = response.headers.get("Content-Disposition")?.match(/filename="?([A-Za-z0-9._-]+)"?/i)?.[1];
    const filename = candidate?.toLowerCase().endsWith(`.${format}`) ? candidate : `percakapan-agent.${format}`;
    return { blob: await response.blob(), filename };
  },
};
