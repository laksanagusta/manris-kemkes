import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CollectionToolbar({
  title,
  description,
  leading,
  actions,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const hasContext = Boolean(title || description || leading);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center",
        hasContext ? "md:justify-between" : "md:justify-end",
        className,
      )}
    >
      {hasContext ? (
        <div>
          {leading}
          {title ? (
            <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
