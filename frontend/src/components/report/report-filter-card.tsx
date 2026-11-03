import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function ReportFilterCard({ children }: { children: ReactNode }) {
  return (
    <Card role="region" aria-label="Filter laporan" className="min-w-0">
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ReportFilterRow({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-end gap-4">{children}</div>;
}
