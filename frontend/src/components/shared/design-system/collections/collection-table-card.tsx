"use client";
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CollectionPagination } from "./collection-pagination";
import { CollectionSortProvider, type CollectionSortControls } from "./collection-sorting";

export function CollectionTableCard({
  children,
  className,
  sorting,
  ...props
}: { children: ReactNode; sorting?:CollectionSortControls } & Omit<ComponentProps<typeof Card>, "children">) {
  const items = Children.toArray(children);
  const isPagination = (item: ReactNode) =>
    isValidElement(item) && item.type === CollectionPagination;

  return (
    <CollectionSortProvider controls={sorting}><Card className={cn("gap-0 py-0", className)} data-collection-table="" {...props}>
      <CardContent className="min-w-0 p-0">
        <div className="min-w-0">
          {items.filter((item) => !isPagination(item))}
        </div>
      </CardContent>
      {items.filter(isPagination)}
    </Card></CollectionSortProvider>
  );
}
