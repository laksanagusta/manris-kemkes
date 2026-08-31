import type { ComponentProps } from "react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CollectionTableHead({
  className,
  density = "default",
  ...props
}: ComponentProps<typeof TableHead> & {
  density?: "default" | "compact";
}) {
  return (
    <TableHead
      className={cn(
        "whitespace-nowrap text-left align-middle font-normal uppercase tracking-[0.05em] text-muted-foreground",
        density === "compact" ? "text-[11px]" : "text-xs",
        className,
      )}
      {...props}
    />
  );
}
