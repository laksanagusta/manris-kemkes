"use client";

import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

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
  if (asChild) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2 shadow-none", className)}
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
      className={cn("gap-2 shadow-none", className)}
      {...props}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </Button>
  );
}
