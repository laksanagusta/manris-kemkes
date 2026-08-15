import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CollectionPageHeader({
  icon,
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div>{eyebrow}</div> : null}
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex size-7 shrink-0 items-center justify-center text-foreground">
              {icon}
            </span>
          ) : null}
          <h1 className="text-[30px] leading-9 font-semibold tracking-[-0.16px] text-foreground text-balance">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
