import type { ComponentProps } from "react";

import { TableHeader } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CollectionTableHeader({
  className,
  density = "default",
  ...props
}: ComponentProps<typeof TableHeader> & {
  density?: "default" | "compact";
}) {
  return (
    <TableHeader
      className={cn(
        "bg-table-header/70 [&_tr]:!h-11 [&_th]:!h-11 [&_tr]:border-b [&_tr]:border-border/50",
        density === "compact"
          ? "[&_tr]:!h-10 [&_th]:!h-10"
          : undefined,
        className,
      )}
      {...props}
    />
  );
}
