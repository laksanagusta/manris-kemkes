"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getAppPageMeta } from "@/lib/app-navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar() {
  const pathname = usePathname();
  const pageTitle = getAppPageMeta(pathname).title;

  return (
    <header
      data-slot="app-topbar"
      className="fixed inset-x-0 top-0 z-50 isolate flex h-14 w-full shrink-0 self-start bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex min-w-0 flex-1">
        <div className="hidden h-full shrink-0 items-center border-e border-border/60 px-2 transition-[width] duration-200 ease-(--ease-out) motion-reduce:transition-none md:flex md:w-(--sidebar-width) md:group-data-[state=collapsed]/sidebar-wrapper:w-(--sidebar-width-icon) md:group-data-[state=collapsed]/sidebar-wrapper:justify-center">
          <Link
            href="/overview"
            className="font-logo flex min-w-0 items-center rounded-md px-2 py-1 text-[20px] leading-5 font-semibold lowercase tracking-[-0.4px] text-foreground outline-hidden transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring md:group-data-[state=collapsed]/sidebar-wrapper:hidden"
          >
            <span className="min-w-0 truncate">Manris</span>
          </Link>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/60 px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-1">
            <SidebarTrigger className="md:hidden" />
            <Link
              href="/overview"
              className="font-logo flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[20px] leading-5 font-semibold lowercase tracking-[-0.4px] text-foreground outline-hidden transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <span className="truncate">Manris</span>
            </Link>
          </div>

          <h1 className="truncate text-center text-sm font-medium text-foreground">
            {pageTitle}
          </h1>

          <div aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
