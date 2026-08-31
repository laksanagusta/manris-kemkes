"use client";

import type { ComponentProps, ReactNode } from "react";
import { MoreHorizontal } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionIconButton({
  icon,
  "aria-label": ariaLabel,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "variant"> & {
  icon?: ReactNode;
  "aria-label": string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className={cn(
        "border border-border/60 bg-card text-muted-foreground shadow-none",
        className,
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {icon || <MoreHorizontal className="size-3.5" />}
    </Button>
  );
}
