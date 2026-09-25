import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function ReportEmptyState({
  title,
  description,
  className,
}: {
  title?: ReactNode;
  description: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("min-h-40", className)}>
      <EmptyHeader>
        {title ? <EmptyTitle>{title}</EmptyTitle> : null}
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
