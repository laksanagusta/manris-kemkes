"use client";

import { usePathname } from "next/navigation";
import { breadcrumbMap } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";

export function AppHeader() {
  const pathname = usePathname();
  const actions = useHeaderActions();
  const pageTitle = breadcrumbMap[pathname] ?? "Manajemen Risiko";

  return (
    <header className="font-display mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
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
