import type { ComponentProps } from "react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CollectionTableHead({
  className,
  ...props
}: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "whitespace-nowrap text-left align-middle text-sm font-medium capitalize text-muted-foreground/75",
        className,
      )}
      {...props}
    />
  );
}
