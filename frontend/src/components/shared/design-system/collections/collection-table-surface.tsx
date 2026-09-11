import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CollectionTableSurfaceProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
};

/**
 * Card-free table shell for ledgers embedded in an existing surface.
 * Standalone collection tables should use CollectionTableCard instead.
 */
export function CollectionTableSurface({
  children,
  className,
  viewportClassName,
}: CollectionTableSurfaceProps) {
  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "w-full overflow-x-auto",
          viewportClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
