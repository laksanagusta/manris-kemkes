import type { ReactNode } from "react";

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
      className={className}
    />
  );
}
