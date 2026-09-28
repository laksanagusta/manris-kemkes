import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function InlineCard({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}
