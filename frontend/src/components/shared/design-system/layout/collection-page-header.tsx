import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CollectionPageHeader({
  icon,
  eyebrow,
  backAction,
  title,
  description,
  actions,
  actionsPlacement = "header",
  className,
}: {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  backAction?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  actionsPlacement?: "header" | "title";
  className?: string;
}) {
  const actionsInTitleRow = actionsPlacement === "title" && Boolean(actions);

  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between",
        actionsInTitleRow && "sm:block",
        className,
      )}
    >
      <div className="min-w-0 space-y-3">
        {backAction ? <div>{backAction}</div> : null}
        {eyebrow ? <div>{eyebrow}</div> : null}
        <div
          className={cn(
            actionsInTitleRow &&
              "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          )}
        >
          <div className="min-w-0">
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
              <p className="mt-2 text-sm leading-5 text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </div>
          {actionsInTitleRow ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
      {actions && !actionsInTitleRow ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
