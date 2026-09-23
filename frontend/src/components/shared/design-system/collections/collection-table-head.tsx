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
  // Keep the prop for API compatibility; the enclosing header owns density.
  void density;

  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap !px-5 !py-3 text-left align-middle text-[13px] font-medium capitalize text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}
