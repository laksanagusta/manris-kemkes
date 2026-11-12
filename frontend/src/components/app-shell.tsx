"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { AgentIcon } from "@/components/shared/icons";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useAuth } from "@/contexts/auth-context";
import { SimulatedTimeNotice } from "@/components/shared/design-system/domain/simulated-time-notice";
import { simulatedBusinessTime } from "@/lib/business-clock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bodyRef = useRef<HTMLDivElement>(null);
  const { hasFullSession, token } = useAuth();
  const [inboxCount, setInboxCount] = useState(0);
  const simulatedTime = simulatedBusinessTime();
  const showAgent = !isAIFeaturesDisabled();

  useLayoutEffect(() => {
    if (!window.location.hash) {
      bodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

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
        <SidebarProvider>
          <div data-app-shell="" className="relative flex h-dvh w-full overflow-hidden bg-(--app-shell-canvas) [--sidebar-width:260px] lg:[--sidebar-width:300px]">
            <AppSidebar inboxBadge={hasFullSession ? inboxCount : 0} />
            <div data-app-shell-pane="" className="flex min-w-0 flex-1 flex-col md:p-2">
              <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-workspace text-pretty [--workspace-gutter:--spacing(4)] md:rounded-(--surface-radius) md:shadow-(--surface-shadow-low) md:[--workspace-gutter:--spacing(5)]">
                <div className="hidden min-h-11 shrink-0 items-center border-b border-border px-(--workspace-gutter) md:flex">
                  <AppBreadcrumbs />
                </div>
                <SidebarTrigger aria-label="Buka navigasi" className="ms-(--workspace-gutter) mt-5 size-11 shrink-0 md:hidden" />
                <div ref={bodyRef} data-app-shell-body="" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-pt-6 px-(--workspace-gutter) pb-8 pt-3 md:pt-5">
                  <AppHeader />
                  {simulatedTime && (
                    <div className="mb-4 shrink-0">
                      <SimulatedTimeNotice date={simulatedTime} />
                    </div>
                  )}
                  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
                </div>
              </SidebarInset>
              {showAgent && (
                <footer className="hidden h-7 shrink-0 items-center justify-end px-1 md:flex">
                  <Link href="/agent" className="inline-flex h-full items-center gap-1.5 rounded-sm px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <AgentIcon aria-hidden="true" className="size-3.5" />
                    Agent
                  </Link>
                </footer>
              )}
            </div>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </SettingsProvider>
  );
}
