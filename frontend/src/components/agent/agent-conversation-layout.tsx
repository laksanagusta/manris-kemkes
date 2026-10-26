import type { ReactNode } from "react";
import { agentDate } from "@/lib/agent-helpers";

export function AgentConversationHeader({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <header className="agent-header">
      <h1 className="sr-only">{title}</h1>
      <div className="agent-header-title">{children}</div>
      <div className="agent-header-actions">{actions}</div>
    </header>
  );
}

/** Shared reading rhythm; the caller retains control of messages and scrolling. */
export function AgentConversationLayout({ startedAt, children }: { startedAt: string; children: ReactNode }) {
  return (
    <div className="agent-column agent-messages">
      <time className="agent-conversation-time" dateTime={startedAt} aria-label={`Waktu mulai percakapan: ${agentDate(startedAt)}`}>{agentDate(startedAt)}</time>
      <div className="agent-timeline">{children}</div>
    </div>
  );
}
