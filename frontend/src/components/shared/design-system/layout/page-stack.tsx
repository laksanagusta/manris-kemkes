import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function PageStack({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("min-w-0 space-y-4 animate-fade-in", className)}
      {...props}
    />
  );
}
