import type { ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { CollectionFilterTrigger } from "./collection-filter-trigger";

export function CollectionFilterPopover({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <CollectionFilterTrigger />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] rounded-xl bg-popover p-4"
      >
        <div className="space-y-4">
          {children}
          {footer}
        </div>
      </PopoverContent>
    </Popover>
  );
}
