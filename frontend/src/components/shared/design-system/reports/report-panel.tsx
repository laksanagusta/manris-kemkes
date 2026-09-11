import type { ReactNode } from "react";

import { StandardCard } from "../layout/standard-card";
import { cn } from "@/lib/utils";

export function ReportPanel({
  title,
  actions,
  children,
  className,
  headerClassName,
  contentClassName,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}) {
  return (
    <StandardCard
      title={title}
      action={actions}
      className={cn(className)}
      headerClassName={headerClassName}
      contentClassName={cn("space-y-3", contentClassName)}
    >
      {children}
    </StandardCard>
  );
}
