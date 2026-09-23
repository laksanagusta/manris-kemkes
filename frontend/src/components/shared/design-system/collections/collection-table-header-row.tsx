import type { ComponentProps } from "react";

import { TableRow } from "@/components/ui/table";

export function CollectionTableHeaderRow(
  props: ComponentProps<typeof TableRow>,
) {
  return <TableRow className="h-11 hover:bg-transparent" {...props} />;
}
