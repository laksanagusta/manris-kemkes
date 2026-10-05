"use client";

import Link from "next/link";
import { ManriskMark } from "@/components/manrisk-mark";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar() {
  return (
    <header
      data-slot="app-topbar"
      className="fixed inset-x-0 top-0 z-50 flex h-14 w-full shrink-0 items-center border-b border-sidebar-border bg-background px-3 md:hidden"
    >
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger aria-label="Buka navigasi" />
        <Link
          href="/overview"
          className="font-logo inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-2xl leading-7 font-semibold lowercase tracking-[-0.4px] text-foreground outline-hidden transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ManriskMark />
          <span>Manrisk</span>
        </Link>
      </div>
    </header>
  );
}
