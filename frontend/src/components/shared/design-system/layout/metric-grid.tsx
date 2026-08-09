import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function MetricGrid({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}
