"use client";

import { annualProgressLayout, annualProgressWidgets } from "./annual-profile-progress-charts";
import { ReportWidget } from "@/components/shared/design-system/reports/report-widget";
import { Skeleton } from "@/components/ui/skeleton";

export function AnnualProfileProgressSkeleton() {
  return (
    <div className="@container/report">
      <span role="status" className="sr-only">Memuat progres profil risiko…</span>
      <div className={annualProgressLayout}>
        {annualProgressWidgets.map(({ title }) => (
          <ReportWidget key={title} title={title} chart>
            <Skeleton className="h-64 w-full" />
          </ReportWidget>
        ))}
      </div>
    </div>
  );
}
