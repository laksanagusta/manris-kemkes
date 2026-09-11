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
  // Keep the prop for API compatibility; compact density changes header geometry,
  // not the shared 12px/500 header typography.
  void density;

  return (
    <TableHead
      className={cn(
        "whitespace-nowrap text-left align-middle text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
