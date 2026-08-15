import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function ArchivedBanner({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-2xl bg-amber-50/80">
      <CardContent className="space-y-1 p-4 text-sm text-amber-900">
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
