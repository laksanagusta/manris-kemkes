"use client";

import type { ComponentProps, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

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
      className={cn("text-muted-foreground", className)}
      aria-label={ariaLabel}
      {...props}
    >
      {icon || <MoreHorizontal className="size-3.5" />}
    </Button>
  );
}
