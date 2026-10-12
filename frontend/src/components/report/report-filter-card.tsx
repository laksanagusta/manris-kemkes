import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function ReportFilterCard({ children }: { children: ReactNode }) {
  return (
    <Card role="region" aria-label="Filter laporan" className="min-w-0">
      <CardContent>{children}</CardContent>
    </Card>
  );
}
