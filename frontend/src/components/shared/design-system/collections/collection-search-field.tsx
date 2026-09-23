import type { ComponentProps, KeyboardEvent } from "react";
import { Search } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/kbd";

import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

export function CollectionSearchField({
  className,
  containerClassName,
  onKeyDown,
  ...props
}: ComponentProps<typeof SearchInput> & { containerClassName?: string }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || event.key !== "Escape" || !event.currentTarget.value) {
      return;
    }

    const input = event.currentTarget;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;

    valueSetter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return (
    <div
      className={cn(
        "relative min-w-0 w-full sm:w-80 sm:flex-none",
        containerClassName,
      )}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <SearchInput
        {...props}
        type="text"
        role="searchbox"
        aria-keyshortcuts="Escape"
        placeholder={props.placeholder ?? " "}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer h-9 bg-card pl-10 pr-12 text-sm peer-placeholder-shown:pr-3",
          className,
        )}
      />
      <Kbd
        aria-hidden="true"
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 peer-placeholder-shown:hidden"
      >
        Esc
      </Kbd>
    </div>
  );
}
