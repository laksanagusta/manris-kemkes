import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function CollectionEmptyState({
  title = "Belum ada data",
  description,
  action,
  align = "left",
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Empty
      className={cn(
        align === "left" ? "items-start text-left" : undefined,
        className,
      )}
    >
      <EmptyHeader
        className={cn(
          "gap-1",
          align === "left" ? "items-start text-left" : undefined,
        )}
      >
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription className="text-xs leading-5">
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
