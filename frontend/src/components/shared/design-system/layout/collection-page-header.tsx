import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { PageHeaderActionsPortal } from "./page-header-actions-portal";

export function CollectionPageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  showTitle = false,
  showSubtitle = false,
  actions,
  actionsPlacement = "header",
  className,
}: {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  showTitle?: boolean;
  showSubtitle?: boolean;
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
                      "flex flex-col gap-4",
                    actionsInTitleRow && (showSubtitle
                      ? "lg:flex-row lg:flex-wrap lg:items-start lg:justify-between"
                      : "sm:flex-row sm:items-center sm:justify-between"),
                  )}
                >
                  <div className={showSubtitle && actionsInTitleRow ? "min-w-0 lg:flex-[1_1_20rem]" : undefined}>
                    <div className="flex items-center gap-2.5">
                      {icon ? (
                        <span className="flex size-7 shrink-0 items-center justify-center text-foreground">
                          {icon}
                        </span>
                      ) : null}
                      <h1 className="text-page-title wrap-anywhere tracking-normal text-balance">{title}</h1>
                    </div>
                    {showSubtitle && subtitle ? (
                      <p className="mt-2 max-w-prose text-sm leading-snug text-pretty text-muted-foreground">{subtitle}</p>
                    ) : null}
                  </div>
                  {actionsInTitleRow ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
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
