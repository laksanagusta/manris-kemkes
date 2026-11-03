import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

/** Shared inset and section rhythm for risk and working-paper detail rails. */
export function DetailSidePanel({ children }: { children: ReactNode }) {
  return (
    <Card data-detail-side-panel="" className="overflow-hidden transition-colors duration-300">
      <CardContent>
        <div className="space-y-4">{children}</div>
      </CardContent>
    </Card>
  );
}
