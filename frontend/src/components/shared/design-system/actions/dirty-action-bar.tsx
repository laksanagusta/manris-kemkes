"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DirtyActionBar({
  visible,
  status,
  actions,
  className,
}: {
  visible: boolean;
  status: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-5 z-40 transition-[opacity,transform] duration-200 ease-(--ease-out) motion-reduce:transition-opacity md:right-6 md:left-[calc(var(--sidebar-width)+1.5rem)] md:group-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+1.5rem)]",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 motion-reduce:translate-y-0",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-lg bg-card px-4 py-3 smooth-shadow-ring-lg shadow-black smooth-ring-neutral-300/30">
        <div className="min-w-0 text-sm text-muted-foreground">{status}</div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
