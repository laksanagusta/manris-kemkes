"use client";

import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "@/components/ui/icons";

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
  icon?: ReactNode;
  loading?: boolean;
}) {
  const hasSmoothElevation = className?.includes("smooth-shadow-") ?? false;
  const buttonClassName = cn(
    "gap-2 rounded-[8px]",
    !hasSmoothElevation && "shadow-none",
    className,
  );

  if (asChild) {
    return (
      <Button
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
      variant={variant}
      size={size}
      className={buttonClassName}
      {...props}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </Button>
  );
}
