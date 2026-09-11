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
        "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-sm outline-none transition-[background-color,border-color] placeholder:text-muted-foreground hover:border-foreground/15 focus:border-primary focus-visible:border-primary focus:ring-0 focus-visible:ring-0 disabled:pointer-events-none disabled:bg-disabled-surface disabled:text-disabled-foreground disabled:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export { SearchInput };
