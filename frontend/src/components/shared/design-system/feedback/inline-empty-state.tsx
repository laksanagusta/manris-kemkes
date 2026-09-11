import type { ReactNode } from "react";

export function InlineEmptyState({
  message,
  icon,
  action,
}: {
  message: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[36px] items-center justify-center gap-2 rounded-md bg-state-surface px-3 text-center text-xs text-state-foreground">
      {icon}
      <span>{message}</span>
      {action}
    </div>
  );
}
