import type { ReactNode } from "react";

import { StandardCard } from "../layout/standard-card";

export function OverviewTrendCard({
  title = "Tren Skor Risiko per Semester",
  chart,
  legend,
  summary,
  children,
}: {
  title?: ReactNode;
  chart?: ReactNode;
  legend?: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <StandardCard
      title={<span className="text-sm">{title}</span>}
    >
      <div className="space-y-4">
        {summary}
        {legend ? (
          <div
            role="list"
            aria-label="Legenda tren risiko"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            {legend}
          </div>
        ) : null}
        {chart ?? children}
      </div>
    </StandardCard>
  );
}
