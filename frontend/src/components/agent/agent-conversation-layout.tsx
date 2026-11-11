import type { ComponentProps, ReactNode } from "react";
import { agentDate } from "@/lib/agent-helpers";
import { ArrowDown } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

export function AgentConversationHeader({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <header className="agent-header">
      <h1 className="sr-only">{title}</h1>
      <div className="agent-header-title">{children}</div>
      <div className="agent-header-actions">{actions}</div>
    </header>
  );
}

type AgentScrollViewportProps = Omit<ComponentProps<"div">, "className"> & {
  start: boolean;
  onJumpToLatest?: () => void;
};

export function AgentScrollViewport({ start, onJumpToLatest, ...props }: AgentScrollViewportProps) {
  return (
    <div className={start ? "contents" : "agent-scroll-frame"}>
      <div {...props} className={start ? "agent-scroll agent-scroll-new" : "agent-scroll"} />
      {!start && onJumpToLatest && (
        <div className="agent-column agent-scroll-actions">
          <Button type="button" variant="link" size="sm" onClick={onJumpToLatest}>
            <ArrowDown aria-hidden="true" />
            Ke pesan terbaru
          </Button>
        </div>
      )}
    </div>
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
