import type { AgentConversationDetail } from "../types/agent.ts";

// Only rendered conversation content changes should trigger following, not a
// new object returned by polling or a metadata-only conversation timestamp.
export function agentScrollContentKey(detail: AgentConversationDetail | null): string {
  if (!detail) return "";
  return JSON.stringify({
    conversation: detail.conversation.id,
    messages: detail.messages,
    runs: detail.runs.map(({ id, status, events, error }) => ({ id, status, events, error })),
    proposals: detail.proposals,
  });
}
