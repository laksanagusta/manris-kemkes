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
        "h-9 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-1 text-sm outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground focus:border-black focus-visible:border-black focus:ring-0 focus-visible:ring-0 disabled:pointer-events-none disabled:bg-muted/50 disabled:opacity-50 dark:focus:border-white dark:focus-visible:border-white",
        className,
      )}
      {...props}
    />
  );
}

export { SearchInput };
