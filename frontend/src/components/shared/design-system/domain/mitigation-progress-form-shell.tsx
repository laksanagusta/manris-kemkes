import type { ReactNode } from "react";

export function MitigationProgressFormShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-none">
      {children}
    </div>
  );
}
