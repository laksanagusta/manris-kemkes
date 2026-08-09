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
    <div className="flex min-h-[36px] items-center justify-center gap-2 rounded-md border border-dashed border-border/40 bg-muted/10 px-3 text-center text-xs text-muted-foreground">
      {icon}
      <span>{message}</span>
      {action}
    </div>
  );
}
