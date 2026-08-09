"use client";

import type { ReactNode } from "react";

export function DesignSystemSectionLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="mb-3 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}
