import type { ComponentProps } from "react";
import { Search } from "lucide-react";

import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

export function CollectionSearchField({
  className,
  ...props
}: ComponentProps<typeof SearchInput>) {
  return (
    <div className="relative min-w-0 flex-1 sm:w-64 md:flex-none">
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <SearchInput
        className={cn(
          "bg-card pl-10 text-sm ring-1 ring-inset ring-border/40",
          className,
        )}
        {...props}
      />
    </div>
  );
}
