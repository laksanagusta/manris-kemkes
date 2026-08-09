import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ReportEmptyState({
  title,
  description,
  className,
}: {
  title?: ReactNode;
  description: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-8 text-center",
        className,
      )}
    >
      <div className="max-w-sm space-y-2">
        {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
