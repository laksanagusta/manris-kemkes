"use client";

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
      {loading ? loadingLabel : children}
    </Button>
  );
}
