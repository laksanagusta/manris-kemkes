"use client";

import { MotionText } from "../motion/motion-primitives";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

export type LoadingActionButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingLabel?: string;
};

export function LoadingActionButton({
  loading = false,
  loadingLabel = "Memproses...",
  disabled,
  children,
  ...props
}: LoadingActionButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {typeof children === "string" && !props.asChild ? (
        <span className="inline-grid">
          <span aria-hidden="true" className="invisible col-start-1 row-start-1">{children}</span>
          <span aria-hidden="true" className="invisible col-start-1 row-start-1">{loadingLabel}</span>
          <span className="col-start-1 row-start-1"><MotionText value={loading ? loadingLabel : children} /></span>
        </span>
      ) : loading ? loadingLabel : children}
    </Button>
  );
}
