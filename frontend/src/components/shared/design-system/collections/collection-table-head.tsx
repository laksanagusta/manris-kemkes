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
  // not the shared 13px/500 header typography.
  void density;

  return (
    <TableHead
      className={cn(
        "whitespace-nowrap !px-6 !py-1.5 text-left align-middle text-[13px] font-medium capitalize text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}
