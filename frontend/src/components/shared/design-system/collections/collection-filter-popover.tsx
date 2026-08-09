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
        className="w-[22rem] rounded-2xl border border-border/60 bg-popover p-4 shadow-none ring-1 ring-inset ring-border/60"
      >
        <div className="space-y-4">
          {children}
          {footer}
        </div>
      </PopoverContent>
    </Popover>
  );
}
