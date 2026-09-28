"use client";

import type { ComponentProps, ReactNode } from "react";


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
  size = "default",
  ...props
}: DestructiveButtonProps) {
  return (
    <ActionButton
      {...props}
      variant="destructive"
      size={size}
      className={className}
    >
      {children}
    </ActionButton>
  );
}
