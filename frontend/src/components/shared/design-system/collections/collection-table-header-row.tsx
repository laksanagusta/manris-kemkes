import type { ComponentProps } from "react";

import { TableRow } from "@/components/ui/table";

export function CollectionTableHeaderRow(
  props: ComponentProps<typeof TableRow>,
) {
  return <TableRow className="h-[40.5px] hover:bg-transparent" {...props} />;
}
