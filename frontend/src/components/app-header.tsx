"use client";

import { usePathname } from "next/navigation";
import { breadcrumbMap } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";

export function AppHeader() {
  const pathname = usePathname();
  const actions = useHeaderActions();
  const pageTitle = breadcrumbMap[pathname] ?? "Manajemen Risiko";

  return (
    <header className="font-display mb-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold tracking-tight text-foreground">
          {pageTitle}
        </span>
      </div>
      {actions && (
        <div className="flex min-w-0 items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
