"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { buttonChildWithIcon, buttonContent } from "./button-content";

export function AccentButton({
  children,
  icon,
  asChild = false,
  className,
  style,
  ...props
}: ComponentProps<typeof Button> & { icon?: ReactNode }) {
  const sharedProps = {
    variant: "default" as const,
    size: "default" as const,
    className,
    style,
  };

  if (asChild) {
    return (
      <Button {...sharedProps} {...props} asChild>
        {buttonChildWithIcon(children, icon)}
      </Button>
    );
  }

  return (
    <Button {...sharedProps} {...props}>
      {buttonContent(children, icon)}
    </Button>
  );
}
