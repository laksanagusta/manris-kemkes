import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ActionButton } from "../actions/action-button";

export function CollectionDialogCancel({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <ActionButton
      variant="outline"
      size="md"
      className={cn(
        "border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30",
        className,
      )}
      {...props}
    />
  );
}
