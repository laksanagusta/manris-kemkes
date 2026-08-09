import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function ReportGrid({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-6 lg:grid-cols-2", className)} {...props} />;
}
