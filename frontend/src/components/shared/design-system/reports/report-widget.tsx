import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FormFrame, FormPanel } from "../layout/form-container";

export function ReportWidget({ title, children, action, chart = false, className }: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  chart?: boolean;
  className?: string;
}) {
  const header = (
    <CardHeader className={cn("px-4 py-3", action && "items-center")}>
      <CardTitle className="text-sm text-muted-foreground"><h2>{title}</h2></CardTitle>
      {action && <CardAction>{action}</CardAction>}
    </CardHeader>
  );

  if (chart) {
    return (
      <FormFrame className={cn("flex flex-col", className)}>
        {header}
        <FormPanel className="flex-1 p-4">{children}</FormPanel>
      </FormFrame>
    );
  }

  return (
    <Card className={cn("min-w-0 gap-0 p-0", className)}>
      {header}
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}
