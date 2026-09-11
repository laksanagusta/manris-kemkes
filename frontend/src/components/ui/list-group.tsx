import * as React from "react";

import { cn } from "@/lib/utils";

function ListGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-group"
      className={cn("overflow-hidden rounded-xl", className)}
      {...props}
    />
  );
}

export { ListGroup };
