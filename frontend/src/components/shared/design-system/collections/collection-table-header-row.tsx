import type { ComponentProps } from "react";

import { TableRow } from "@/components/ui/table";

export function CollectionTableHeaderRow(
  props: ComponentProps<typeof TableRow>,
) {
  return <TableRow {...props} />;
}
