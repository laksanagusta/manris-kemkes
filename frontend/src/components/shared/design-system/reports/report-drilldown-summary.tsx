"use client";

import type { ReactNode } from "react";

export function ReportDrilldownSummary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset: () => void;
}) {
  return (
    <div className="surface-hairline flex flex-wrap items-center gap-2 rounded-lg bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Drilldown aktif:</span>
      {children}
      <button
        type="button"
        onClick={onReset}
        className="ml-auto text-[11px] font-medium text-primary hover:underline"
      >
        Reset filter
      </button>
    </div>
  );
}
