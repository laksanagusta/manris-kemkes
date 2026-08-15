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
        "bg-table-header [&_tr]:border-b [&_tr]:border-border",
        density === "compact"
          ? "[&_tr]:!h-10 [&_th]:!h-10 [&_th]:!py-0"
          : undefined,
        className,
      )}
      {...props}
    />
  );
}
