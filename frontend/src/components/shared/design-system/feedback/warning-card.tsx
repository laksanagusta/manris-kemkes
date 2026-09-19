import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function WarningCard({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-lg bg-warning-card-surface p-0 text-warning-card-foreground">
      <CardContent className="space-y-1 p-4 text-sm text-warning-card-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
