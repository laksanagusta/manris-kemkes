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
    <StandardCard
      title={title}
      className="rounded-lg"
      headerClassName="px-5 pb-3 pt-5"
      contentClassName="px-5 pb-5 pt-0"
    >
      {chart}
      {legend ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {legend}
        </div>
      ) : null}
    </StandardCard>
  );
}
