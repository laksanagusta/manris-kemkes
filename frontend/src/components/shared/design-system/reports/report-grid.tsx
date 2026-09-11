import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function ReportGrid({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid w-full items-stretch gap-6 md:grid-cols-2 [&>*]:min-w-0",
        className,
      )}
      {...props}
    />
  );
}
