"use client";

import { useState } from "react";

import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Search,
} from "@/components/shared/icons";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarBrandHeader, SidebarNavigationGroup } from "@/components/shared/sidebar-navigation-layout";
import { SidebarNavItem } from "@/components/shared/sidebar-nav-item";

const items = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Evaluasi", href: "/evaluations", icon: ClipboardCheck },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Search", href: "/search", icon: Search },
] as const;

export function SidebarMotionExample() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeHref, setActiveHref] = useState<string>(items[0].href);

  return (
    <div className="space-y-4 rounded-(--surface-radius) bg-card p-6 shadow-black">
      <SidebarProvider open={!collapsed} className="min-h-0 w-full">
        <div
          className="group flex w-[260px] max-w-full flex-col overflow-hidden rounded-(--surface-radius) border border-border bg-sidebar data-[collapsible=icon]:w-12"
          data-collapsible={collapsed ? "icon" : undefined}
        >
          <SidebarBrandHeader collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
          <div className="flex flex-col gap-5 pb-3 group-data-[collapsible=icon]:gap-2">
            <SidebarNavigationGroup>
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
            </SidebarNavigationGroup>
            <SidebarNavigationGroup title="OPERASIONAL">
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
            </SidebarNavigationGroup>
          </div>
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
