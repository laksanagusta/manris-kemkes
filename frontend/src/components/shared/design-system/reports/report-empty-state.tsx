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
        "flex min-h-40 items-center justify-center rounded-[12px] bg-state-surface px-6 py-8 text-center text-state-foreground",
        className,
      )}
    >
      <div className="max-w-sm space-y-2">
        {title ? <p className="text-sm font-medium text-state-foreground">{title}</p> : null}
        <p className="text-sm text-state-foreground">{description}</p>
      </div>
    </div>
  );
}
