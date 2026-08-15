"use client";

import { usePathname } from "next/navigation";
import { breadcrumbMap } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";

export function AppHeader() {
  const pathname = usePathname();
  const actions = useHeaderActions();
  const pageTitle = breadcrumbMap[pathname] ?? "Manajemen Risiko";

  if (
    pathname === "/risk/register" ||
    pathname === "/risk/working-papers" ||
    pathname === "/evaluations" ||
    pathname === "/inbox" ||
    pathname === "/minutes" ||
    pathname === "/management/charters" ||
    pathname === "/reports/compliance-monitoring" ||
    pathname === "/reports" ||
    pathname === "/risk/cascading" ||
    pathname === "/risk/history" ||
    pathname === "/intelligence/document" ||
    pathname === "/management/planning" ||
    pathname === "/management/tmpmr" ||
    pathname === "/compliance/controls" ||
    pathname === "/compliance/monitoring" ||
    pathname === "/compliance/penanganan" ||
    pathname === "/admin/users" ||
    pathname === "/admin/organizations" ||
    pathname === "/settings/groups" ||
    pathname === "/reports/performance-risk"
  ) {
    return null;
  }

  return (
    <header className="font-display mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
        <span className="app-page-title block min-w-0">
          {pageTitle}
        </span>
      </div>
      {actions && (
        <div className="flex min-w-0 items-start justify-end gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
