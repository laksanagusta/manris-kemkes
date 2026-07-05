import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconTileVariants = cva(
  "inline-flex shrink-0 items-center justify-center",
  {
    variants: {
      size: {
        default: "size-11 rounded-2xl",
        app: "size-14 rounded-3xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function IconTile({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof iconTileVariants>) {
  return (
    <div
      data-slot="icon-tile"
      data-size={size}
      className={cn(iconTileVariants({ size }), className)}
      {...props}
    />
  );
}

export { IconTile, iconTileVariants };
