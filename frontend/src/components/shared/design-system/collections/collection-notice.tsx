import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CollectionNotice({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
