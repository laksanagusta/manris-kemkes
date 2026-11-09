"use client";

import type { ComponentProps, KeyboardEvent } from "react";
import { Search, X } from "@/components/shared/icons";
import { SearchInput } from "@/components/shared/search-input";
import { cn } from "@/lib/utils";

function clearSearch(input: HTMLInputElement) {
  if (!input.value || input.disabled || input.readOnly) return;

  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function CollectionSearchField({
  className,
  containerClassName,
  onKeyDown,
  ...props
}: ComponentProps<typeof SearchInput> & { containerClassName?: string }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && event.key === "Escape") {
      clearSearch(event.currentTarget);
    }
  };

  return (
    <div
      data-slot="collection-search"
      className={cn("relative w-full min-w-0 sm:w-[340px] sm:max-w-full sm:flex-none", containerClassName)}
    >
      <Search aria-hidden="true" className="pointer-events-none absolute start-2 top-1/2 z-10 size-[18px] -translate-y-1/2 text-table-sort-indicator" />
      <SearchInput
        {...props}
        type="text"
        role="searchbox"
        aria-keyshortcuts="Escape"
        placeholder={props.placeholder ?? " "}
        onKeyDown={handleKeyDown}
        className={cn("h-8 ps-[34px] pe-9 font-normal", className)}
      />
      <button
        type="button"
        aria-label="Kosongkan pencarian"
        disabled={props.disabled || props.readOnly}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          const input = event.currentTarget.parentElement?.querySelector("input");
          if (input) {
            clearSearch(input);
            input.focus();
          }
        }}
        className="absolute end-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-control text-table-header-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}
