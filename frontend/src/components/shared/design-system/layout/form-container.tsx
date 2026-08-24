import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FormContainer({
  title,
  description,
  children,
  footer,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-xl bg-card p-0",
        className,
      )}
    >
      {title || description ? (
        <CardHeader className="px-4 py-6 !pb-6">
          {title ? (
            <CardTitle className="text-sm font-medium normal-case text-foreground">
              {title}
            </CardTitle>
          ) : null}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="p-4">{children}</CardContent>
      {footer}
    </Card>
  );
}
