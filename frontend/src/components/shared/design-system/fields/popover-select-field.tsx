"use client";

import { ChevronDown } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PopoverSelectOption = {
  value: string;
  label: string;
};

export type PopoverSelectFieldProps = {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: readonly PopoverSelectOption[];
  placeholder: string;
  ariaLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  emptyMessage?: string;
};

export function PopoverSelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  invalid = false,
  triggerClassName,
  contentClassName,
  emptyMessage = "Tidak ada opsi.",
}: PopoverSelectFieldProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            "group/popover-select h-10 w-full justify-between gap-2 rounded-lg border-0 border-shadow bg-card px-3 text-sm font-normal transition-[background-color,box-shadow] active:translate-y-0 active:scale-100 aria-expanded:bg-card aria-expanded:text-foreground hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/30",
            !selected && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 opacity-60 transition-transform duration-150 ease-(--ease-out) group-data-[state=open]/popover-select:rotate-180 motion-reduce:transition-none" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-[var(--radix-dropdown-menu-trigger-width)]",
          contentClassName,
        )}
      >
        {options.length === 0 ? (
          <div className="h-8 px-2 text-sm leading-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
