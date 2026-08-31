"use client";

import Link from "next/link";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import type { ElementType, ReactNode } from "react";
import type { MouseEventHandler } from "react";

import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const MotionLink = motion.create(Link);
const SIDEBAR_HOVER_EASE = [0.2, 0, 0, 1] as const;
const SIDEBAR_SPRING = {
  type: "spring" as const,
  duration: 0.35,
  bounce: 0.18,
};

const sidebarIconVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.08,
    y: -1.5,
    transition: {
      duration: 0.18,
      ease: SIDEBAR_HOVER_EASE,
    },
  },
  tap: {
    scale: 0.92,
    y: 0,
    transition: SIDEBAR_SPRING,
  },
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
 * Shared animated sidebar item for high-frequency navigation such as
 * Dashboard, Library, and Search. It animates only transforms, opacity-like
 * color changes, and the shared active surface, so the row never reflows.
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
  const reducedMotion = useReducedMotion();

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
          <MotionLink
            aria-current={isActive ? "page" : undefined}
            href={href}
            initial="rest"
            onClick={onClick}
            whileHover={reducedMotion ? undefined : "hover"}
            whileTap={reducedMotion ? undefined : "tap"}
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 rounded-md bg-sidebar-accent"
                layoutId="sidebar-active-background"
                transition={SIDEBAR_SPRING}
              />
            )}
            <motion.span
              aria-hidden="true"
              className={cn(
                "relative z-10 inline-flex size-4 shrink-0 items-center justify-center transition-[color] duration-[180ms] ease-(--ease-out) [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-[stroke-width,color] [&>svg]:duration-[180ms] [&>svg]:ease-(--ease-out) group-hover/menu-button:[&>svg]:[stroke-width:1.95] group-active/menu-button:[&>svg]:[stroke-width:2.1]",
                isActive
                  ? "!text-sidebar-accent-foreground"
                  : "!text-sidebar-muted-foreground",
                !isActive && "[&>svg]:[stroke-width:1.8]",
              )}
              variants={sidebarIconVariants}
            >
              <Icon aria-hidden="true" />
            </motion.span>
            <span className="relative z-10">{label}</span>
            {badge}
          </MotionLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </MotionConfig>
  );
}
