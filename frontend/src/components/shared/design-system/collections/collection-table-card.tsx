import type { ComponentProps, ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollectionTableCard({
  children,
  className,
  ...props
}: { children: ReactNode } & Omit<ComponentProps<typeof Card>, "children">) {
  return (
    <Card
      className={cn(
        "relative w-full min-w-0 gap-0 overflow-hidden rounded-[12px] bg-card p-0 [&_tbody_tr:last-child]:border-0",
        className,
      )}
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}
