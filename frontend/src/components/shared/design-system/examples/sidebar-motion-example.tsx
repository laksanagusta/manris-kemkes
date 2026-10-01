"use client";

import { useState } from "react";

import {
  BookOpen,
  LayoutDashboard,
  Search,
} from "@/components/shared/icons";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNavItem } from "@/components/shared/sidebar-nav-item";

const items = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Search", href: "/search", icon: Search },
] as const;

export function SidebarMotionExample() {
  const [activeHref, setActiveHref] = useState<string>(items[0].href);

  return (
    <div className="space-y-4 rounded-[12px] bg-card p-6 shadow-black">
      <SidebarProvider className="min-h-0 w-full">
        <div className="flex w-full max-w-xs flex-col gap-1 rounded-lg border-[0.5px] border-border bg-sidebar py-2">
          <div className="font-logo px-4 py-3 text-xl font-semibold lowercase tracking-[-0.4px] text-sidebar-foreground">
            Manris
          </div>
          <SidebarGroup>
            <SidebarMenu className="gap-1">
              {items.slice(0, 1).map((item) => (
                <SidebarNavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  isActive={activeHref === item.href}
                  label={item.label}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveHref(item.href);
                  }}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>OPERASIONAL</SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {items.slice(1).map((item) => (
                <SidebarNavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  isActive={activeHref === item.href}
                  label={item.label}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveHref(item.href);
                  }}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarProvider>
      <p className="text-xs text-muted-foreground">
        Ikon tetap statis tanpa transform atau transition khusus. Surface aktif
        langsung mengikuti menu terpilih tanpa animasi slide; label dan ikon
        inactive memakai muted foreground, sedangkan label aktif memakai
        foreground aktif serta font medium.
      </p>
    </div>
  );
}
