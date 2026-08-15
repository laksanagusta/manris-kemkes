import type { ReactNode } from "react";

export function MitigationProgressFormShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5">
      {children}
    </div>
  );
}
