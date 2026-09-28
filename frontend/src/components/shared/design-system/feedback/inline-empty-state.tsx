import type { ReactNode } from "react";

import { IllustratedEmptyState } from "./illustrated-empty-state";

export function InlineEmptyState({
  message,
  action,
}: {
  message: ReactNode;
  action?: ReactNode;
}) {
  return (
    <IllustratedEmptyState
      title={message}
      action={action}
      size="compact"
      className="min-h-24"
    />
  );
}
