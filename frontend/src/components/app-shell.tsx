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
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
        <div className="flex flex-1 pt-14">
          <AppSidebar collapsed={collapsed} inboxBadge={inboxCount} />
          <main
            className={cn(
              "flex-1 p-6 transition-all duration-300 animate-fade-in",
              collapsed ? "ml-16" : "ml-64"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
