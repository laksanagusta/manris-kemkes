import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IllustratedEmptyState } from "../feedback/illustrated-empty-state";

export function CollectionEmptyState({
  title = "Belum ada data",
  description,
  action,
  align = "center",
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <IllustratedEmptyState
      title={title}
      description={description}
      action={action}
      align={align}
      className={cn("min-h-24 px-4 py-6 sm:px-6", className)}
    />
  );
}
