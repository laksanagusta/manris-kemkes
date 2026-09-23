import * as React from "react";

import { cn } from "@/lib/utils";

function SearchInput({
  className,
  type = "search",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="search-input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border-0 border-shadow bg-card px-3 py-1 text-sm outline-none transition-[background-color,box-shadow] placeholder:text-muted-foreground hover:bg-muted/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:bg-disabled-surface disabled:text-disabled-foreground disabled:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export { SearchInput };
