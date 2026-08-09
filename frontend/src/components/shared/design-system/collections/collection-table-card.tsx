import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function CollectionTableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="relative gap-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-card p-0 shadow-none ring-0 [&_tbody_tr]:border-b [&_tbody_tr]:border-border/50 [&_tbody_tr:last-child]:border-0">
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}
