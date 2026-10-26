import assert from "node:assert/strict";
import test from "node:test";
import { agentAttachmentError, agentAttachmentWarning, agentRefreshRequest, agentRelativeTime, isAgentRunning, safeAgentHref, includedAgentOperations, isAgentNearBottom, agentConversationTimeline } from "./agent-helpers.ts";
import type { AgentConversationDetail } from "../types/agent.ts";
import type { AgentOperation } from "../types/agent.ts";

test("history times use compact elapsed units and handle boundaries safely", () => {
  const now = Date.parse("2026-10-24T08:00:00+07:00");
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  for (const [minutes, expected] of [[0, "baru saja"], [1, "1m"], [59, "59m"], [60, "1h"], [420, "7h"], [1440, "1d"], [6 * 1440, "6d"], [7 * 1440, "1w"], [42 * 1440, "6w"]] as const) {
    assert.equal(agentRelativeTime(ago(minutes), now), expected);
  }
  assert.equal(agentRelativeTime(ago(-60), now), "baru saja");
  assert.equal(agentRelativeTime("invalid", now), "—");
});

test("agent source links stay inside supported application routes", () => {
  for (const invalid of ["https://attacker.test", "//attacker.test", "/\\attacker.test", "javascript:alert(1)", "/login", "/risk\n/unsafe", " /risk/register", null]) assert.equal(safeAgentHref(invalid), undefined);
  assert.equal(safeAgentHref("/risk/register/123?version=2#details"), "/risk/register/123?version=2#details");
  assert.equal(safeAgentHref("/compliance/penanganan"), "/compliance/penanganan");
});

test("agent attachments enforce PDF/XLSX and the 1 MB boundary", () => {
  assert.equal(agentAttachmentError({ name: "profil.PDF", size: 1024 * 1024 }), null);
  assert.equal(agentAttachmentError({ name: "profil.xlsx", size: 1 }), null);
  assert.match(agentAttachmentError({ name: "profil.xlsx", size: 1024 * 1024 + 1 })!, /maksimal 1 MB/);
  assert.match(agentAttachmentError({ name: "profil.xls", size: 10 })!, /PDF atau Excel/);
  assert.match(agentAttachmentError({ name: "profil.pdf", size: 0 })!, /kosong/);
});
test("document truncation warnings remain understandable in Indonesian", () => {
  assert.equal(agentAttachmentWarning("Document text was truncated to 60000 characters for AI analysis."), "Teks dokumen dibatasi 60.000 karakter. Bagian setelah batas ini belum dianalisis.");
  assert.equal(agentAttachmentWarning("Dokumen terbaca sebagian."), "Dokumen terbaca sebagian.");
});

test("refresh carries the original scope and snapshot in a new instruction", () => {
  const widget = { id: "a", type: "metrics" as const, title: "Ringkasan risiko", scopeLabel: "Unit A · 2026", snapshotAt: "2026-10-24T08:00:00Z" };
  const before = JSON.stringify(widget);
  const instruction = agentRefreshRequest(widget);
  assert.match(instruction, /Ringkasan risiko/);
  assert.match(instruction, /Unit A · 2026/);
  assert.match(instruction, /2026-10-24T08:00:00Z/);
  assert.match(instruction, /tambahkan hasil baru/);
  assert.equal(JSON.stringify(widget), before);
});

test("only queued and running jobs keep active polling", () => {
  assert.equal(isAgentRunning("queued"), true);
  assert.equal(isAgentRunning("running"), true);
  for (const status of ["waiting_for_input", "waiting_for_confirmation", "completed", "failed", "cancelled"] as const) assert.equal(isAgentRunning(status), false);
});

test("excluded proposal operations are omitted from apply count", () => {
  const operations: AgentOperation[] = [{ id: "a", title: "A", kind: "create_risk", included: true, after: {} }, { id: "b", title: "B", kind: "create_risk", included: false, after: {} }];
  assert.equal(includedAgentOperations(operations), 1);
  assert.equal(includedAgentOperations([]), 0);
});

test("new results follow a reader at the bottom and preserve older reading positions", () => {
  assert.equal(isAgentNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 }), true);
  assert.equal(isAgentNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 540 }), true);
  assert.equal(isAgentNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 200 }), false);
  assert.equal(isAgentNearBottom({ scrollHeight: 200, clientHeight: 400, scrollTop: 0 }), true);
});

test("a run keeps the same timeline identity when its assistant result arrives", () => {
  const run = { id: "run-1", conversationId: "c", status: "running" as const, events: [] };
  const user = { id: "u", conversationId: "c", runId: run.id, role: "user" as const, content: "Review", widgets: [], attachments: [], createdAt: "2026-10-24T00:00:00Z" };
  const detail: AgentConversationDetail = { conversation: { id: "c", title: "Review", status: "running", createdAt: user.createdAt, updatedAt: user.createdAt }, runs: [run], messages: [user], proposals: [] };
  const before = agentConversationTimeline(detail);
  const after = agentConversationTimeline({ ...detail, runs: [{ ...run, status: "completed" }], messages: [user, { ...user, id: "a", role: "assistant", content: "Done" }] });
  assert.equal(before[0].id, after[0].id);
  assert.equal(after.length, 1);
  assert.deepEqual(after[0].messages.map((message) => message.id), ["u", "a"]);
});
