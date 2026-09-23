import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CollectionEmptyState({
  title = "Belum ada data",
  description,
  action,
  align = "left",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className="p-4">
      <div
        className={cn(
          "rounded-[12px] bg-state-surface px-4 py-8 text-state-foreground",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        <p className="text-sm font-medium text-state-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-state-foreground">{description}</p>
        )}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
