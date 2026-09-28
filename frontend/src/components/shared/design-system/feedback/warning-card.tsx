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
    <Card className="">
      <CardContent className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
