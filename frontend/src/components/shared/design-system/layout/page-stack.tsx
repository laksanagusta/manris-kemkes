import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function PageStack({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 space-y-6 motion-safe:animate-fade-in",
        className,
      )}
      {...props}
    />
  );
}
