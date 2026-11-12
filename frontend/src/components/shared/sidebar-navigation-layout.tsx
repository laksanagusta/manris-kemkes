"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { ManriskMark } from "@/components/manrisk-mark";
import { PanelLeftIcon } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarNavigationScroll({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const viewport = root.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    const content = items.current;
    if (!viewport || !content) return;

    const update = () => {
      setHasMoreBelow(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 1);
    };

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <ScrollArea ref={root} data-scroll-edge-visible={hasMoreBelow ? "" : undefined}
      className={cn("sidebar-navigation-scroll scroll-edge-blur min-h-0 flex-1", className)}>
      <div ref={items} className="relative z-0 flex flex-col gap-5 pb-3 group-data-[collapsible=icon]:gap-2">
        {children}
      </div>
    </ScrollArea>
  );
}

export function SidebarBrandHeader({
  collapsed,
  mobile = false,
  onToggle,
}: {
  collapsed: boolean;
  mobile?: boolean;
  onToggle: () => void;
}) {
  return (
    <SidebarHeader className={cn(
      "h-[68px] shrink-0 flex-row items-center justify-between gap-1 pt-1 pb-0 ps-5 pe-3",
      collapsed && "justify-center px-0",
    )}>
      {!collapsed && (
        <Link
          href="/overview"
          className={cn(
            "font-logo flex min-w-0 items-center gap-2 rounded-md font-semibold lowercase tracking-[-0.4px] text-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
            mobile ? "text-lg leading-6" : "text-2xl leading-7",
          )}
        >
          <ManriskMark size={mobile ? 20 : 24} />
          <span className="truncate">Manrisk</span>
        </Link>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent pointer-coarse:size-11"
        aria-label={mobile ? "Tutup navigasi" : collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <PanelLeftIcon aria-hidden="true" className="size-4" />
      </Button>
    </SidebarHeader>
  );
}

export function SidebarNavigationGroup({ title, children }: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <SidebarGroup className="px-2.5 py-0 group-data-[collapsible=icon]:px-2">
      {title && (
        <SidebarGroupLabel className="h-5 px-2.5 text-[11px] uppercase group-data-[collapsible=icon]:hidden">
          {title}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-px [&_[data-slot=sidebar-menu-button]]:h-9 [&_[data-slot=sidebar-menu-button]]:gap-2.5 [&_[data-slot=sidebar-menu-button]]:rounded-lg [&_[data-slot=sidebar-menu-button]]:px-2.5 pointer-coarse:[&_[data-slot=sidebar-menu-button]]:min-h-11 group-data-[collapsible=icon]:pointer-coarse:[&_[data-slot=sidebar-menu-button]]:min-h-0">
        {children}
      </SidebarMenu>
    </SidebarGroup>
  );
}
