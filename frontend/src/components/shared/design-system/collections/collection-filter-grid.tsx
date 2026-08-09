import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function CollectionFilterGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_260px]",
        className,
      )}
      {...props}
    />
  );
}
