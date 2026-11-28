import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Search semantics and shared search-surface styling on the stock Input. */
export function SearchInput({ type = "search", className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-search-field=""
      type={type}
      className={cn("placeholder:text-tertiary-foreground dark:placeholder:text-muted-foreground", className)}
      {...props}
    />
  );
}
