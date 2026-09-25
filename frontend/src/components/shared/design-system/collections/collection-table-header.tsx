import type { ComponentProps } from "react";

import { TableHeader } from "@/components/ui/table";

export function CollectionTableHeader({
  className,
  density = "default",
  ...props
}: ComponentProps<typeof TableHeader> & {
  density?: "default" | "compact";
}) {
  void density;

  return <TableHeader className={className} {...props} />;
}
