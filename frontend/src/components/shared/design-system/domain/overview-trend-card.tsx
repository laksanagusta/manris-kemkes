import type { ReactNode } from "react";

import { StandardCard } from "../layout/standard-card";

export function OverviewTrendCard({
  title = "Tren Skor Risiko per Semester",
  chart,
  legend,
}: {
  title?: ReactNode;
  chart: ReactNode;
  legend?: ReactNode;
}) {
  return (
    <StandardCard title={title} contentClassName="px-4 pb-4 pt-0">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/35 to-muted/10 p-4">
        {chart}
      </div>
      {legend ? (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          {legend}
        </div>
      ) : null}
    </StandardCard>
  );
}
