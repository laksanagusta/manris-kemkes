"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup } from "motion/react";
import * as Icons from "@/components/shared/icons";
import { SidebarNavItem } from "@/components/shared/sidebar-nav-item";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { documentationGroups, documentationHref } from "@/lib/documentation-navigation";

function DocumentationSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="offcanvas" className="text-pretty md:border-r-[0.5px] md:border-border">
      <SidebarHeader className="flex-row items-center px-4 py-6 text-pretty">
        <Link href="/panduan/pengenalan" onClick={() => setOpenMobile(false)}
          className="font-logo flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md text-[20px] font-semibold lowercase tracking-[-0.4px] outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
          Manris
          <span className="ml-auto text-xs font-normal tracking-normal text-muted-foreground">panduan</span>
        </Link>
        {isMobile && <Button variant="ghost" size="icon" aria-label="Tutup menu panduan" onClick={() => setOpenMobile(false)}><Icons.X aria-hidden="true" /></Button>}
      </SidebarHeader>
      <LayoutGroup id="documentation-sidebar">
        <SidebarContent className="text-pretty">
          <nav aria-label="Topik dokumentasi" className="pb-4">
            {documentationGroups.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => (
                    <SidebarNavItem key={item.slug} href={documentationHref(item.slug)}
                      label={item.title}
                      isActive={pathname === documentationHref(item.slug)}
                      onClick={() => setOpenMobile(false)} />
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>
      </LayoutGroup>
      <SidebarFooter className="px-2 py-4 text-pretty">
        <SidebarMenu>
          <SidebarNavItem href="/overview" label="Kembali ke aplikasi" />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DocumentationShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider className="text-pretty">
        <a href="#isi-panduan" className="sr-only fixed top-3 left-3 z-50 rounded-md bg-card px-4 py-3 focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring">Lewati ke artikel</a>
        <DocumentationSidebar />
        <SidebarInset className="min-w-0">
          <div className="flex items-center justify-between px-5 pt-4 md:hidden">
            <span className="text-sm font-medium">Panduan Manris</span>
            <SidebarTrigger aria-label="Buka menu panduan" />
          </div>
          <main id="isi-panduan" tabIndex={-1} className="min-w-0 outline-none">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
