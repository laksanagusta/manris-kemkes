"use client";

import { FeedbackPopover, type FeedbackSubmission } from "./feedback-popover";
import { MessageSquare } from "@/components/shared/icons";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export function SidebarFeedback() {
  const { token, user } = useAuth();

  async function send(input: FeedbackSubmission) {
    if (!token) throw new Error("Sesi berakhir");
    await api.post("/feedback", input, token);
  }

  return <FeedbackMenu key={user?.id} onSubmit={send} />;
}

export function FeedbackMenu({ onSubmit, preview = false }: {
  onSubmit: (input: FeedbackSubmission) => Promise<void>;
  preview?: boolean;
}) {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <FeedbackPopover onSubmit={onSubmit} preview={preview} side={isMobile ? "top" : "right"} align={isMobile ? "start" : "end"}>
          <SidebarMenuButton tooltip="Feedback" aria-label="Feedback" className="text-muted-foreground">
            <MessageSquare aria-hidden="true" />
            <span>Feedback</span>
          </SidebarMenuButton>
        </FeedbackPopover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
