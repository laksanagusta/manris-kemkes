"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { buttonChildWithIcon, buttonContent } from "./button-content";

export function ActionButton({
  children,
  icon,
  loading = false,
  asChild = false,
  className,
  variant = "outline",
  size = "default",
  ...props
}: ComponentProps<typeof Button> & {
  icon?: ReactNode;
  loading?: boolean;
}) {
  if (asChild) {
    return (
      <Button
        aria-busy={loading || undefined}
        variant={variant}
        size={size}
        className={className}
        {...props}
        asChild
      >
        {buttonChildWithIcon(children, icon)}
      </Button>
    );
  }

  return (
    <Button
      aria-busy={loading || undefined}
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {buttonContent(children, icon)}
    </Button>
  );
}
