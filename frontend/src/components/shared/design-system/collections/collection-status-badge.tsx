import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CollectionStatusBadge({
  className,
  ...props
}: ComponentProps<typeof Badge>) {
  return (
    <Badge
      size="compact"
      className={cn("justify-start", className)}
      {...props}
    />
  );
}
