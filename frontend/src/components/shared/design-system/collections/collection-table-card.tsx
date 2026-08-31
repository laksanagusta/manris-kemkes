import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function CollectionTableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="relative w-full min-w-0 gap-0 overflow-hidden rounded-xl bg-card p-0 [&_tbody_tr:last-child]:border-0"
    >
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}
