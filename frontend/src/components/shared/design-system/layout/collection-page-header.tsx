import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { PageHeaderActionsPortal } from "./page-header-actions-portal";

export function CollectionPageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  showTitle = false,
  actions,
  actionsPlacement = "header",
  className,
}: {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  showTitle?: boolean;
  actions?: ReactNode;
  actionsPlacement?: "header" | "title" | "top";
  className?: string;
}) {
  const actionsInTitleRow =
    showTitle && actionsPlacement === "title" && Boolean(actions);
  const actionsInTopSlot = actionsPlacement === "top" && Boolean(actions);
  const hasLeftContent = Boolean(eyebrow || (showTitle && title));
  const hasHeaderContent = hasLeftContent || Boolean(actions && !actionsInTopSlot);

  if (!hasHeaderContent && !actionsInTopSlot) {
    return null;
  }

  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {actionsInTopSlot ? (
        <PageHeaderActionsPortal>{actions}</PageHeaderActionsPortal>
      ) : null}
      {hasHeaderContent ? (
        <div
          className={cn(
            "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between",
            actionsInTitleRow && "sm:block",
          )}
        >
          {hasLeftContent ? (
            <div
              className={cn(
                "min-w-0",
                (eyebrow || (showTitle && title)) && "space-y-3",
              )}
            >
              {eyebrow ? <div>{eyebrow}</div> : null}
              {showTitle ? (
                <div
                  className={cn(
                    actionsInTitleRow &&
                      "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      {icon ? (
                        <span className="flex size-7 shrink-0 items-center justify-center text-foreground">
                          {icon}
                        </span>
                      ) : null}
                      <h1 className="page-title">{title}</h1>
                    </div>
                    {subtitle ? (
                      <p className="mt-1 text-sm leading-6 text-secondary-foreground text-pretty">
                        {subtitle}
                      </p>
                    ) : null}
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
          {actions && !actionsInTitleRow && !actionsInTopSlot ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ms-auto">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
