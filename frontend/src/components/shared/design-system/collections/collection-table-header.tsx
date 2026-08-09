import type { ComponentProps } from "react";

import { TableHeader } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CollectionTableHeader({
  className,
  ...props
}: ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader
      className={cn(
        "bg-white [&_tr]:border-b [&_tr]:border-border/40",
        className,
      )}
      {...props}
    />
  );
}
