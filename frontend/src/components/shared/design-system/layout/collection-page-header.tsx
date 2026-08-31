import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CollectionPageHeader({
  icon,
  eyebrow,
  backAction,
  title,
  showTitle = false,
  actions,
  actionsPlacement = "header",
  className,
}: {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  backAction?: ReactNode;
  title: ReactNode;
  showTitle?: boolean;
  actions?: ReactNode;
  actionsPlacement?: "header" | "title";
  className?: string;
}) {
  const actionsInTitleRow =
    showTitle && actionsPlacement === "title" && Boolean(actions);
  const hasLeftContent = Boolean(backAction || eyebrow || (showTitle && title));
  const hasHeaderContent = hasLeftContent || Boolean(actions);

  if (!hasHeaderContent) {
    return null;
  }

  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between",
        actionsInTitleRow && "sm:block",
        className,
      )}
    >
      {hasLeftContent ? (
        <div
          className={cn(
            "min-w-0",
            (backAction || eyebrow || (showTitle && title)) && "space-y-3",
          )}
        >
          {backAction ? <div>{backAction}</div> : null}
          {eyebrow ? <div>{eyebrow}</div> : null}
          {showTitle ? (
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
                  <h1 className="text-2xl leading-8 font-semibold tracking-[-0.16px] text-foreground text-balance">
                    {title}
                  </h1>
                </div>
              </div>
              {actionsInTitleRow ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div aria-hidden="true" />
      )}
      {actions && !actionsInTitleRow ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2",
            !hasLeftContent && "sm:ms-auto",
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
