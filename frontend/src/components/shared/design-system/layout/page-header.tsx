import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border",
        className,
      )}
    >
      {eyebrow ? (
        <div className="flex items-center border-b border-border/60 px-4 py-4">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {eyebrow}
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 px-4 pb-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
    </div>
  );
}
