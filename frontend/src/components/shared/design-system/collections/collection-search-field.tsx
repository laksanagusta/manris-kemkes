import type { ComponentProps } from "react";
import { Search } from "@/components/ui/icons";

import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

export function CollectionSearchField({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof SearchInput> & { containerClassName?: string }) {
  return (
    <div
      className={cn(
        "relative min-w-0 w-full sm:w-80 sm:flex-none",
        containerClassName,
      )}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <SearchInput
        className={cn(
          "border border-input bg-card pl-10 text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}
