import assert from "node:assert/strict";
import test from "node:test";
import { agentScrollContentKey } from "./agent-scroll-state.ts";
import type { AgentConversationDetail } from "../types/agent.ts";
const detail: AgentConversationDetail = {
  conversation: { id: "chat", title: "Risiko", status: "running", createdAt: "2026-10-26", updatedAt: "2026-10-26" },
  messages: [{ id: "m", conversationId: "chat", role: "user", content: "Buat risiko", attachments: [], widgets: [], createdAt: "2026-10-26" }],
  runs: [{ id: "run", conversationId: "chat", status: "running", events: [] }], proposals: [],
};
test("unchanged polls and metadata-only refreshes do not trigger scroll", () => {
  const refreshed = structuredClone(detail);
  refreshed.conversation.updatedAt = "2026-10-27";
  assert.equal(agentScrollContentKey(detail), agentScrollContentKey(refreshed));
});
test("new messages, activity changes and review state affect scroll content", () => {
  const message = structuredClone(detail); message.messages[0].content += " baru";
  const run = structuredClone(detail); run.runs[0].status = "completed";
  const proposal = structuredClone(detail); proposal.proposals.push({ id: "p", conversationId: "chat", runId: "run", revision: 1, status: "proposed", title: "Usulan", operations: [], createdAt: "2026-10-26" });
  for (const next of [message, run, proposal]) assert.notEqual(agentScrollContentKey(detail), agentScrollContentKey(next));
});
