import type { ReactNode } from "react";

import { StandardCard } from "../layout/standard-card";
import { cn } from "@/lib/utils";

export function ReportPanel({
  title,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <StandardCard
      title={title}
      action={actions}
      className={cn(
        "h-full",
        className,
      )}
      contentClassName={cn("space-y-3", contentClassName)}
    >
      {children}
    </StandardCard>
  );
}
