"use client";

import { SettingsProvider } from "@/components/settings/settings-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { SimulatedTimeNotice } from "@/components/shared/design-system/domain/simulated-time-notice";
import { simulatedBusinessTime } from "@/lib/business-clock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { hasFullSession, token } = useAuth();
  const [inboxCount, setInboxCount] = useState(0);
  const simulatedTime = simulatedBusinessTime();

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
    <SettingsProvider>
      <TooltipProvider delayDuration={200}>
        <SidebarProvider style={{ "--sidebar-width": "260px" } as CSSProperties}>
          <div data-app-shell="" className="relative flex min-h-svh w-full bg-workspace">
            <AppSidebar inboxBadge={hasFullSession ? inboxCount : 0} />
            <SidebarInset className="min-w-0 overflow-x-clip border-0 bg-workspace text-pretty shadow-none">
              <div className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-5 md:px-6 lg:px-8 [--workspace-mobile-nav-space:3.5rem] md:[--workspace-mobile-nav-space:0rem]">
                <SidebarTrigger aria-label="Buka navigasi" className="mb-3 size-11 md:hidden" />
                <AppHeader />
                {simulatedTime && (
                  <div className="mb-4">
                    <SimulatedTimeNotice date={simulatedTime} />
                  </div>
                )}
                <div className="w-full min-w-0">{children}</div>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </SettingsProvider>
  );
}
