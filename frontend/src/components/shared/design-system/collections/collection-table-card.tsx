import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { CollectionPagination } from "./collection-pagination";

export function CollectionTableCard({
  children,
  className,
  ...props
}: { children: ReactNode } & Omit<ComponentProps<typeof Card>, "children">) {
  const items = Children.toArray(children);
  const isPagination = (item: ReactNode) =>
    isValidElement(item) && item.type === CollectionPagination;

  return (
    <Card className={className} data-collection-table="" {...props}>
      <CardContent>
        <div className="-m-(--card-spacing) min-w-0">
          {items.filter((item) => !isPagination(item))}
        </div>
      </CardContent>
      {items.filter(isPagination)}
    </Card>
  );
}
