"use client";

import { ChevronDown } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { IllustratedEmptyState } from "../feedback/illustrated-empty-state";

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
  side?: "top" | "right" | "bottom" | "left";
  avoidCollisions?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  optionClassName?: string;
  emptyMessage?: string;
};

export function PopoverSelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  side,
  avoidCollisions,
  ariaLabel,
  disabled = false,
  invalid = false,
  triggerClassName,
  contentClassName,
  optionClassName,
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
            "group/popover-select w-full justify-between active:translate-y-0 active:scale-100",
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
        side={side}
        avoidCollisions={avoidCollisions}
        sideOffset={8}
        className={cn(
          "w-[var(--radix-dropdown-menu-trigger-width)]",
          contentClassName,
        )}
      >
        {options.length === 0 ? (
          <IllustratedEmptyState
            title={emptyMessage}
            size="compact"
            className="py-2"
          />
        ) : (
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className={optionClassName}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
