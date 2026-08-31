"use client";

import { usePathname } from "next/navigation";
import { breadcrumbMap } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";
import { CollectionPageHeader } from "@/components/shared/design-system";

export function AppHeader() {
  const pathname = usePathname();
  const actions = useHeaderActions();
  const pageTitle = breadcrumbMap[pathname] ?? "Manajemen Risiko";

  if (
    pathname.startsWith("/risk/monitoring/") ||
    pathname.startsWith("/risk/assessment/") ||
    pathname === "/risk/register" ||
    pathname.startsWith("/risk/register/") ||
    pathname === "/risk/working-papers" ||
    pathname.startsWith("/risk/working-papers/") ||
    pathname === "/evaluations" ||
    pathname.startsWith("/evaluations/") ||
    pathname === "/inbox" ||
    pathname === "/minutes" ||
    pathname.startsWith("/minutes/") ||
    pathname === "/management/charters" ||
    pathname.startsWith("/management/charters/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname === "/risk/cascading" ||
    pathname === "/risk/history" ||
    pathname === "/overview" ||
    pathname === "/intelligence/document" ||
    pathname.startsWith("/intelligence/minutes") ||
		pathname === "/intelligence/transcript" ||
		pathname === "/intelligence/predictive" ||
    pathname === "/management/planning" ||
    pathname.startsWith("/management/planning/") ||
    pathname === "/management/tmpmr" ||
    pathname.startsWith("/management/tmpmr/") ||
    pathname === "/compliance/controls" ||
    pathname.startsWith("/compliance/controls/") ||
    pathname === "/compliance/monitoring" ||
    pathname === "/compliance/penanganan" ||
    pathname === "/admin/users" ||
    pathname.startsWith("/admin/users/") ||
    pathname === "/admin/organizations" ||
    pathname === "/admin/settings" ||
    pathname === "/settings/groups" ||
    pathname === "/account" ||
    pathname === "/panduan/risiko"
  ) {
    return null;
  }

  return (
    <CollectionPageHeader
      title={pageTitle}
      actions={actions}
      className="mx-auto mb-6 w-full max-w-[1400px]"
    />
  );
}
