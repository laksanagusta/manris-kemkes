import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ProgressMeter({
  value,
  max = 100,
  label,
  valueLabel,
  className,
}: {
  value: number;
  max?: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label}
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">
        {valueLabel ?? `${Math.round(percentage)}%`}
      </span>
    </div>
  );
}
