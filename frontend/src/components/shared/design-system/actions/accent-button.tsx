"use client";

import type { CSSProperties, ComponentProps, ReactNode } from "react";

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
    size: "md" as const,
    className: cn(
      "gap-2 rounded-md border border-[rgba(10,10,10,0.16)] bg-clip-border shadow-[0_1px_2px_-0.5px_rgba(0,0,0,0.08),inset_0_-0.5px_0_0_rgba(0,0,0,0.12)]",
      className,
    ),
    style: {
      "--primary": "#00b9ad",
      "--primary-foreground": "#ffffff",
      borderColor: "rgba(10, 10, 10, 0.16)",
      ...style,
    } as CSSProperties,
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
