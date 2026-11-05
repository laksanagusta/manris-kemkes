"use client";
import type { ComponentProps } from "react";
import { CollectionSortLabel, useCollectionSortHeader } from "./collection-sorting";

import { TableHead } from "@/components/ui/table";

export function CollectionTableHead({
  className,
  density = "default",
  children,
  ...props
}: ComponentProps<typeof TableHead> & {
  density?: "default" | "compact";
}) {
  // Keep the prop for API compatibility; the enclosing header owns density.
  void density;

  const label = typeof children === "string" ? children.trim() : undefined;
  const sort = useCollectionSortHeader(label);
  return <TableHead className={className} {...props} aria-sort={sort ? (sort.active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined) : props["aria-sort"]}>
    {sort && label ? <CollectionSortLabel label={label} {...sort} /> : children}
  </TableHead>;
}
