import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function InsetList({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      role="list"
      className={cn("m-0 list-none divide-y divide-border rounded-lg bg-card-subtle-surface px-3", className)}
      {...props}
    />
  );
}

export function InsetListItem({
  children,
  action,
  className,
  ...props
}: ComponentProps<"li"> & { action?: ReactNode }) {
  return (
    <li className={cn("flex min-w-0 items-center justify-between gap-3 py-2", className)} {...props}>
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}
