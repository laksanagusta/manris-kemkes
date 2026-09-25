import type { ReactNode } from "react";

import { StandardCard } from "../layout/standard-card";

export function OverviewTrendCard({
  title = "Tren Skor Risiko per Semester",
  subtitle,
  chart,
  legend,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  chart?: ReactNode;
  legend?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <StandardCard
      title={title}
      subtitle={subtitle}
    >
      <div className="space-y-4">
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
