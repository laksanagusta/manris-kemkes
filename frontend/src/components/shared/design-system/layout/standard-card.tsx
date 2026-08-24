import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StandardCardProps = {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function StandardCard({
  title,
  children,
  action,
  className,
  contentClassName,
}: StandardCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-xl bg-card p-0",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between px-4 py-4 !pb-4">
        <CardTitle className="font-sans text-sm font-medium normal-case leading-5 text-foreground">
          {title}
        </CardTitle>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
