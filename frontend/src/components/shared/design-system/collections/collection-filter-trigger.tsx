import type { ComponentProps } from "react";

import { Filter } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

import { ActionButton } from "../actions/action-button";

export function CollectionFilterTrigger({
  "aria-label": ariaLabel = "Buka filter",
  title = "Filter",
  className,
  ...props
}: Omit<ComponentProps<typeof ActionButton>, "children">) {
  return (
    <ActionButton
      {...props}
      variant="outline"
      size="md"
      className={cn("h-9 w-9 !px-0", className)}
      aria-label={ariaLabel}
      title={title}
    >
      <Filter className="size-4" strokeWidth={2} aria-hidden="true" />
    </ActionButton>
  );
}
