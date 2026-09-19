"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionButton({
  children,
  icon,
  loading = false,
  asChild = false,
  className,
  variant = "outline",
  size = "md",
  ...props
}: ComponentProps<typeof Button> & {
  /** @deprecated Labeled buttons are text-only in the design system. */
  icon?: ReactNode;
  loading?: boolean;
}) {
  const hasSmoothElevation = className?.includes("smooth-shadow-") ?? false;
  // Keep the prop for backwards-compatible call sites while intentionally
  // omitting decorative icons from rendered labeled buttons.
  void icon;
  const buttonClassName = cn(
    "gap-0 rounded-[8px]",
    !hasSmoothElevation && "shadow-none",
    className,
  );

  if (asChild) {
    return (
      <Button
        aria-busy={loading || undefined}
        variant={variant}
        size={size}
        className={buttonClassName}
        {...props}
        asChild
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      aria-busy={loading || undefined}
      variant={variant}
      size={size}
      className={buttonClassName}
      {...props}
    >
      {children}
    </Button>
  );
}
