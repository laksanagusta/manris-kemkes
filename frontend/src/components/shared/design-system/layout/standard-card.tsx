import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StandardCardProps = {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function StandardCard({
  title,
  children,
  action,
  className,
  headerClassName,
  contentClassName,
}: StandardCardProps) {
  return (
    <Card
      className={cn(
        "surface-hairline gap-0 overflow-hidden rounded-lg bg-card p-0",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between gap-4 px-4 py-4 !pb-4",
          headerClassName,
        )}
      >
        <h2 className="font-sans text-sm font-medium normal-case leading-5 text-foreground">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
