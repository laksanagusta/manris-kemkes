"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AppTopbar } from "@/components/app-topbar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { HeaderActionsProvider } from "@/lib/header-actions-context";

export function AppShell({ children }: { children: React.ReactNode }) {
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
      <SidebarProvider>
        <div className="relative flex min-h-svh w-full flex-col bg-background pt-14">
          <AppTopbar />
          <div className="flex min-h-0 flex-1 w-full">
            <AppSidebar inboxBadge={hasFullSession ? inboxCount : 0} />
            <SidebarInset className="min-w-0 overflow-x-hidden bg-main-content p-4 md:p-6">
              <HeaderActionsProvider>
                <AppHeader />
                <main className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="mx-auto w-full max-w-[1400px] min-w-0 pb-8">
                    {children}
                  </div>
                </main>
              </HeaderActionsProvider>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
