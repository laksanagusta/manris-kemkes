"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AccentButton({
  children,
  icon,
  asChild = false,
  className,
  style,
  ...props
}: ComponentProps<typeof Button> & { icon?: ReactNode }) {
  const sharedProps = {
    variant: "primary" as const,
    size: "primary" as const,
    className: cn(className),
    style,
  };

  if (asChild) {
    return (
      <Button {...sharedProps} {...props} asChild>
        {children}
      </Button>
    );
  }

  return (
    <Button {...sharedProps} {...props}>
      {icon}
      {children}
    </Button>
  );
}
