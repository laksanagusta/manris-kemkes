import type { ComponentProps } from "react";

import { Filter } from "@/components/shared/icons";
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
      size="default"
      className={cn("h-8 w-8 !px-0", className)}
      aria-label={ariaLabel}
      title={title}
    >
      <Filter className="size-4" strokeWidth={2} aria-hidden="true" />
    </ActionButton>
  );
}
