import type { ComponentProps } from "react";

import { TableHead } from "@/components/ui/table";

export function CollectionTableHead({
  className,
  density = "default",
  ...props
}: ComponentProps<typeof TableHead> & {
  density?: "default" | "compact";
}) {
  // Keep the prop for API compatibility; the enclosing header owns density.
  void density;

  return <TableHead className={className} {...props} />;
}
