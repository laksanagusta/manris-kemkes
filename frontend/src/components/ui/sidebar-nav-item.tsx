"use client";

import Link from "next/link";
import {
  MotionConfig,
  motion,
} from "motion/react";
import type { ElementType, ReactNode } from "react";
import type { MouseEventHandler } from "react";

import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const SIDEBAR_SPRING = {
  type: "spring" as const,
  duration: 0.35,
  bounce: 0.18,
};

export interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: ElementType;
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
    <MotionConfig reducedMotion="user">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          className={cn(
            "relative transition-[width,height,padding,background-color,color] duration-[180ms] ease-(--ease-out) data-active:bg-transparent",
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
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 rounded-md bg-sidebar-accent"
                layoutId="sidebar-active-background"
                transition={SIDEBAR_SPRING}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:[stroke-width:1.8]",
                isActive
                  ? "!text-sidebar-accent-foreground"
                  : "!text-secondary-foreground",
              )}
            >
              <Icon aria-hidden="true" />
            </span>
            <span className="relative z-10">{label}</span>
            {badge}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </MotionConfig>
  );
}
