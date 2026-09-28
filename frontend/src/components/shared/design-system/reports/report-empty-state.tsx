import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { IllustratedEmptyState } from "../feedback/illustrated-empty-state";

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
    <IllustratedEmptyState
      title={title ?? "Belum ada data"}
      description={description}
      className={cn("min-h-40", className)}
    />
  );
}
