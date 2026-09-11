import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CollectionFilterInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn("h-9 rounded-lg border border-input bg-card text-sm", className)}
      {...props}
    />
  );
}
