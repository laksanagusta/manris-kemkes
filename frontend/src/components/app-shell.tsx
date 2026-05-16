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
  const { hasFullSession, token } = useAuth();
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!token || !hasFullSession) {
      return;
    }

    let cancelled = false;

    Promise.all([
      api
        .get<{ Count: number }>("/approvals/pending-count", token)
        .catch(() => ({ Count: 0 })),
      api
        .get<{ count: number }>("/working-papers/pending-count", token)
        .catch(() => ({ count: 0 })),
    ]).then(([approvals, wp]) => {
      if (!cancelled) {
        setInboxCount((approvals.Count ?? 0) + (wp.count ?? 0));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasFullSession, token]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
        <div className="flex flex-1 pt-14">
          <AppSidebar
            collapsed={collapsed}
            inboxBadge={hasFullSession ? inboxCount : 0}
          />
          <main
            className={cn(
              "flex-1 px-18 py-6 transition-all duration-300 animate-fade-in",
              collapsed ? "ml-14" : "ml-60",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
