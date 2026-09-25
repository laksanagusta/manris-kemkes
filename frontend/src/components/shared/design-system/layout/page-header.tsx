import type { ReactNode } from "react";

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PageHeader({
  eyebrow,
  title,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle><h1>{title}</h1></CardTitle>
        {eyebrow ? <CardDescription>{eyebrow}</CardDescription> : null}
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
    </Card>
  );
}
