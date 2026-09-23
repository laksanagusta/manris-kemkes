import type { ComponentProps, ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { CollectionFilterTrigger } from "./collection-filter-trigger";

type CollectionFilterPopoverProps = {
  children: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerProps?: ComponentProps<typeof CollectionFilterTrigger>;
  contentClassName?: string;
};

export function CollectionFilterPopover({
  children,
  footer,
  open,
  onOpenChange,
  triggerProps,
  contentClassName,
}: CollectionFilterPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <CollectionFilterTrigger {...triggerProps} />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className={cn(
          "w-[22rem] rounded-[12px] bg-popover p-4",
          contentClassName,
        )}
      >
        <div className="space-y-4">
          {children}
          {footer}
        </div>
      </PopoverContent>
    </Popover>
  );
}
