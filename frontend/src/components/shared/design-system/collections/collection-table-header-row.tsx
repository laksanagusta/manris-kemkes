import type { ComponentProps } from "react";

import { TableRow } from "@/components/ui/table";

export function CollectionTableHeaderRow(
  props: ComponentProps<typeof TableRow>,
) {
  return <TableRow className="h-9 hover:bg-transparent" {...props} />;
}
