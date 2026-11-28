"use client";

import { usePathname } from "next/navigation";
import { SettingsProvider } from "@/components/settings/settings-provider";
import styles from "./app-shell.module.css";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { HeaderTabPortalTargetProvider, useHeaderActions, useHeaderBack } from "@/lib/header-actions-context";
import { SimulatedTimeNotice } from "@/components/shared/design-system/domain/simulated-time-notice";
import { simulatedBusinessTime } from "@/lib/business-clock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [riskDetailTabsTarget, setRiskDetailTabsTarget] = useState<HTMLElement | null>(null);
  const { hasFullSession, token } = useAuth();
  const headerActions = useHeaderActions();
  const headerBack = useHeaderBack();
  const showBreadcrumbOnMobile = Boolean(headerActions || headerBack || pathname === "/risk/register/new");
  const [inboxCount, setInboxCount] = useState(0);
  const simulatedTime = simulatedBusinessTime();

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
      <HeaderTabPortalTargetProvider target={riskDetailTabsTarget}>
        <TooltipProvider delayDuration={200}>
          <SidebarProvider>
            <div data-app-shell="" className="relative flex h-dvh w-full overflow-hidden bg-(--app-shell-canvas) [--sidebar-width:var(--app-sidebar-width)]">
              <AppSidebar inboxBadge={hasFullSession ? inboxCount : 0} />
              <div data-app-shell-pane="" className="flex min-w-0 flex-1 flex-col md:p-2">
                <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-workspace text-pretty [--workspace-gutter:--spacing(4)] md:rounded-(--surface-radius) md:shadow-(--surface-shadow-low) md:[--workspace-gutter:--spacing(5)]">
                  <div className={`min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border px-(--workspace-gutter) py-2 ${showBreadcrumbOnMobile || simulatedTime ? "flex" : "hidden md:flex"}`}>
                    <div className={showBreadcrumbOnMobile ? "min-w-0" : "hidden min-w-0 md:block"}>
                      <AppBreadcrumbs back={headerBack} />
                    </div>
                    <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                      {simulatedTime && <SimulatedTimeNotice date={simulatedTime} />}
                      <div ref={setRiskDetailTabsTarget} data-risk-detail-tabs-slot="" className="flex shrink-0 items-center" />
                      {headerActions && (
                        <div className="flex shrink-0 items-center gap-2">
                          {headerActions}
                        </div>
                      )}
                    </div>
                  </div>
                  <SidebarTrigger aria-label="Buka navigasi" className="ms-(--workspace-gutter) mt-5 size-11 shrink-0 md:hidden" />
                  <div ref={bodyRef} data-app-shell-body="" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-pb-8 scroll-pt-6 px-(--workspace-gutter) pt-3 md:pt-5">
                    <AppHeader />
                    <div data-app-shell-content="" className={`${styles.content} ${styles.bottomInset} flex min-h-0 w-full min-w-0 flex-col`}>
                      {children}
                    </div>
                  </div>
                </SidebarInset>
              </div>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </HeaderTabPortalTargetProvider>
    </SettingsProvider>
  );
}
