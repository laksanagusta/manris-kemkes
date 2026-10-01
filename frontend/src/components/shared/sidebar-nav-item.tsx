"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import type { MouseEventHandler } from "react";

import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export interface SidebarNavItemProps {
  href: string;
  label: string;
  icon?: ElementType;
  isActive?: boolean;
  badge?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * Shared sidebar item for high-frequency navigation such as Dashboard,
 * Library, and Search. The active surface can move between items, while the
 * icon itself remains static so navigation does not add visual noise.
 */
export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive = false,
  badge,
  className,
  onClick,
}: SidebarNavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={cn(
          "relative transition-[width,height,padding,background-color,color] duration-[180ms] ease-(--ease-out) data-active:bg-transparent [&_svg]:text-current",
          isActive
            ? "text-sidebar-accent-foreground"
            : "text-muted-foreground",
          className,
        )}
        isActive={isActive}
        tooltip={label}
      >
        <Link
          aria-current={isActive ? "page" : undefined}
          href={href}
          onClick={onClick}
        >
          {isActive && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 rounded-md bg-active"
            />
          )}
          {Icon ? (
            <span aria-hidden="true" className="relative z-10 inline-flex shrink-0 items-center justify-center">
              <Icon aria-hidden="true" />
            </span>
          ) : null}
          <span className="relative z-10">{label}</span>
          {badge}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
