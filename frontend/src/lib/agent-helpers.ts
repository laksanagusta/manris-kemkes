import type { AgentConversationDetail, AgentMessage, AgentOperation, AgentRun, AgentRunStatus, AgentWidget } from "../types/agent.ts";

export const AGENT_UPLOAD_LIMIT = 1024 * 1024;
export function agentAttachmentError(file: { name: string; size: number }): string | null {
  if (!/\.(pdf|xlsx)$/i.test(file.name)) return "Gunakan dokumen PDF atau Excel (.xlsx).";
  if (file.size === 0) return "Dokumen kosong tidak dapat dilampirkan.";
  if (file.size > AGENT_UPLOAD_LIMIT) return "Ukuran setiap dokumen maksimal 1 MB.";
  return null;
}
export function agentAttachmentWarning(warning: string): string {
  const limit = warning.match(/^Document text was truncated to (\d+) characters for AI analysis\.$/i)?.[1];
  return limit ? `Teks dokumen dibatasi ${Number(limit).toLocaleString("id-ID")} karakter. Bagian setelah batas ini belum dianalisis.` : warning;
}
export function isAgentRunning(status?: string): boolean { return status === "queued" || status === "running"; }
export function isAgentNearBottom(viewport: { scrollHeight: number; scrollTop: number; clientHeight: number }): boolean {
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 80;
}
export function agentConversationTimeline(detail: AgentConversationDetail): { id: string; run?: AgentRun; messages: AgentMessage[] }[] {
  const entries: { id: string; run?: AgentRun; messages: AgentMessage[] }[] = [];
  const runs = new Map(detail.runs.map((run) => [run.id, run]));
  const seen = new Set<string>();
  for (const message of detail.messages) {
    const run = message.runId ? runs.get(message.runId) : undefined;
    if (!run) { entries.push({ id: `message:${message.id}`, messages: [message] }); continue; }
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    entries.push({ id: `run:${run.id}`, run, messages: detail.messages.filter((item) => item.runId === run.id) });
  }
  for (const run of detail.runs) if (!seen.has(run.id)) entries.push({ id: `run:${run.id}`, run, messages: [] });
  return entries;
}
export function safeAgentHref(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return undefined;
  const path = value.split(/[?#]/)[0];
  return /^\/(risk(?:\/|$)|risk-events(?:\/|$)|compliance(?:\/|$)|reports(?:\/|$)|management(?:\/|$)|agent(?:\/|$))/.test(path) ? value : undefined;
}
export function agentRefreshRequest(widget: AgentWidget): string {
  return `Perbarui hasil “${widget.title}” untuk cakupan ${widget.scopeLabel || "yang sama"}. Gunakan data terbaru, tampilkan waktu pengambilan dan sumber, lalu tambahkan hasil baru. Snapshot sebelumnya: ${widget.snapshotAt}.`;
}
export function includedAgentOperations(operations: AgentOperation[]): number { return operations.filter((item) => item.included).length; }
export function agentValue(value: unknown): string {
  if (value === null || value === undefined) return "Tidak tersedia";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
export function agentDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
export function agentRelativeTime(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return "—";
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
export const agentRunLabels: Record<AgentRunStatus, string> = {
  queued: "Menunggu giliran", running: "Sedang mengerjakan", waiting_for_input: "Menunggu jawaban Anda",
  waiting_for_confirmation: "Menunggu tinjauan Anda", completed: "Selesai", failed: "Pekerjaan gagal", cancelled: "Dihentikan",
};
