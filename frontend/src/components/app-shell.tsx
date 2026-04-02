"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = useAuth();
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.get<{ Count: number }>("/approvals/pending-count", token)
      .then((data) => setInboxCount(data.Count ?? 0))
      .catch(() => {});
  }, [token]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen">
        <AppSidebar collapsed={collapsed} inboxBadge={inboxCount} />
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300",
            collapsed ? "ml-16" : "ml-64"
          )}
        >
          <AppHeader
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
          <main className="flex-1 p-6 animate-fade-in">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
