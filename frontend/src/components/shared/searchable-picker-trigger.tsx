import type { ComponentProps, ReactNode } from "react";

import { ChevronDown } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchablePickerTriggerProps
  extends Omit<
    ComponentProps<typeof Button>,
    | "children"
    | "type"
    | "variant"
    | "role"
    | "aria-label"
    | "aria-expanded"
    | "disabled"
    | "className"
  > {
  id?: string;
  "aria-label": string;
  expanded: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function SearchablePickerTrigger({
  id,
  "aria-label": ariaLabel,
  expanded,
  disabled,
  className,
  children,
  ...triggerProps
}: SearchablePickerTriggerProps) {
  return (
    <Button
      {...triggerProps}
      id={id}
      type="button"
      variant="outline"
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={expanded}
      disabled={disabled}
      className={cn(
        "group/popover-select w-full min-w-0 justify-between active:translate-y-0 active:scale-100",
        className,
      )}
    >
      {children}
      <ChevronDown className="pointer-events-none size-4 shrink-0 opacity-60 transition-transform duration-150 ease-(--ease-out) group-data-[state=open]/popover-select:rotate-180 motion-reduce:transition-none" />
    </Button>
  );
}
