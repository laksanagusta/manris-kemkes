import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DocumentForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-card smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DocumentFormSection({
  title,
  titleId,
  description,
  action,
  children,
  className,
  contentClassName,
  showDivider = true,
  stacked = false,
}: {
  title: string;
  titleId?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showDivider?: boolean;
  stacked?: boolean;
}) {
  return (
    <section
      className={cn(
        "grid gap-6 px-6 py-7 lg:px-8 lg:py-8",
        stacked ? "grid-cols-1" : "lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10",
        showDivider && "border-t border-border/70 first:border-t-0",
        className,
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="text-sm font-semibold leading-5 text-foreground"
          >
            {title}
          </h2>
          {action ? <div className="shrink-0 lg:hidden">{action}</div> : null}
        </div>
        {description ? (
          <p className="text-sm leading-6 text-secondary-foreground">
            {description}
          </p>
        ) : null}
        {action ? <div className="hidden pt-2 lg:block">{action}</div> : null}
      </div>
      <div className={cn("min-w-0 space-y-5", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
