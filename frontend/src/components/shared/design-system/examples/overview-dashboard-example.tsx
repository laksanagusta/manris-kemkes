import {
  DashboardKpiCard,
  MetricGrid,
  OverviewCategoryCard,
  OverviewTopRisksCard,
  OverviewTrendCard,
} from "@/components/shared/design-system";

import {
  designSystemOverviewCategorySegments,
  designSystemOverviewDashboardKpis,
  designSystemOverviewTopRisks,
} from "../data/overview-fixtures";

function TrendChartExample() {
  return (
    <svg
      viewBox="0 0 360 180"
      className="h-64 w-full"
      role="img"
      aria-label="Line chart contoh untuk tren skor risiko"
    >
      <g fill="none" stroke="oklch(0.5 0 0 / 10%)" strokeWidth="1">
        <path d="M16 36 H344" />
        <path d="M16 72 H344" />
        <path d="M16 108 H344" />
        <path d="M16 144 H344" />
      </g>
      <path
        d="M16 132 L92 118 L168 126 L244 82 L320 94"
        fill="none"
        stroke="oklch(0.62 0.19 240)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OverviewDashboardExample() {
  return (
    <div className="space-y-4">
      <MetricGrid>
        {designSystemOverviewDashboardKpis.map((item) => (
          <DashboardKpiCard key={item.title} {...item} />
        ))}
      </MetricGrid>
      <div className="grid gap-4 xl:grid-cols-2">
        <OverviewTrendCard
          chart={<TrendChartExample />}
          legend={
            <>
              <span>Aktual</span>
              <span>Target</span>
              <span>4 semester terakhir</span>
            </>
          }
        />
        <OverviewCategoryCard
          total={124}
          totalLabel="Risiko"
          segments={designSystemOverviewCategorySegments}
        />
      </div>
      <OverviewTopRisksCard risks={designSystemOverviewTopRisks} />
    </div>
  );
}
