"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ActionButton } from "./action-button";

type DestructiveButtonProps = Omit<
  ComponentProps<typeof ActionButton>,
  "icon" | "variant"
> & {
  children: ReactNode;
};

export function DestructiveButton({
  children,
  className,
  size = "md",
  ...props
}: DestructiveButtonProps) {
  return (
    <ActionButton
      {...props}
      variant="destructive"
      size={size}
      className={cn(
        "border-0 bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        className,
      )}
    >
      {children}
    </ActionButton>
  );
}
