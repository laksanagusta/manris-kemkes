import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import styles from "./filtered-table-toolbar.module.css";

export function CollectionToolbar({
  title,
  description,
  leading,
  actions,
  className,
  wrapActions = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
  wrapActions?: boolean;
}) {
  const hasContext = Boolean(title || description || leading);

  return (
    <div
      data-slot="collection-toolbar"
      className={cn(
        "flex flex-col gap-3",
        styles.toolbar,
        wrapActions
          ? cn("xl:flex-row", leading ? "xl:items-start" : "xl:items-center", hasContext ? "xl:justify-between" : "xl:justify-end")
          : cn("sm:flex-row", leading ? "sm:items-start" : "sm:items-center", hasContext ? "sm:justify-between" : "sm:justify-end"),
        className,
      )}
    >
      {hasContext ? (
        <div data-slot="collection-toolbar-leading" className={cn("min-w-0", leading && "flex-1")}>
          {leading}
          {title ? (
            <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-sm text-secondary-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {actions ? (
        <div data-slot="collection-toolbar-actions" className={cn(
          "flex min-w-0 gap-2",
          wrapActions
            ? "flex-wrap items-center xl:justify-end"
            : "w-full flex-col sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-end",
        )}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
