import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceMetrics({ items, className }: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-wrap gap-x-5 gap-y-4", className)}>
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0 border-s border-border ps-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-section-title tabular-nums tracking-[-0.015em] text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
