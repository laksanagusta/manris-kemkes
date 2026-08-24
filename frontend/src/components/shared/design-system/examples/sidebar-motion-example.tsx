"use client";

import { LayoutGroup } from "motion/react";
import { useState } from "react";

import {
  BookOpen,
  LayoutDashboard,
  Search,
} from "@/components/ui/icons";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNavItem } from "@/components/ui/sidebar-nav-item";

const items = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Search", href: "/search", icon: Search },
] as const;

export function SidebarMotionExample() {
  const [activeHref, setActiveHref] = useState<string>(items[0].href);

  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
      <SidebarProvider className="min-h-0 w-full">
        <div className="w-full max-w-xs rounded-xl border border-sidebar-border bg-sidebar p-2">
          <LayoutGroup id="design-system-sidebar-motion">
            <SidebarMenu>
              {items.map((item) => (
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
          </LayoutGroup>
        </div>
      </SidebarProvider>
      <p className="text-xs text-muted-foreground">
        Hover untuk scale 1.08 dan translateY -1.5px. Klik memberi press
        feedback 0.92 lalu spring kembali; icon inactive abu-abu, icon active
        mengikuti warna font, dan surface netral berpindah dengan layout
        animation tanpa garis indikator kiri.
      </p>
    </div>
  );
}
