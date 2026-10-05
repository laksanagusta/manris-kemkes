"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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
      data-open={visible}
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "t-panel-slide pointer-events-none fixed inset-x-4 bottom-5 z-40 [--panel-translate-y:8px] [--panel-open-dur:200ms] [--panel-close-dur:150ms] md:right-6 md:left-[calc(var(--sidebar-width)+1.5rem)] md:group-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+1.5rem)]",
        className,
      )}
    >
      <Card className="pointer-events-auto mx-auto w-full max-w-7xl">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0 text-sm text-muted-foreground">{status}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </CardContent>
      </Card>
    </div>
  );
}
