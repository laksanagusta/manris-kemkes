import {
  DashboardKpiCard,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  MetricGrid,
  OverviewTopRisksCard,
  OverviewTrendCard,
  RiskHeatmapGrid,
  StandardCard,
} from "@/components/shared/design-system";
import { ArrowExpand } from "@/components/ui/icons";

import {
  designSystemCurrentRiskMatrix,
  designSystemOverviewDashboardKpis,
  designSystemOverviewTopRisks,
} from "../data/overview-fixtures";

const fixtureMatrix = () =>
  designSystemCurrentRiskMatrix.map((row) => [...row]);

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
    <div className="space-y-5 lg:space-y-6">
      <section aria-label="Ringkasan metrik risiko">
        <MetricGrid className="gap-3">
          {designSystemOverviewDashboardKpis.map((item) => (
            <DashboardKpiCard key={item.title} {...item} />
          ))}
        </MetricGrid>
      </section>

      <section aria-label="Tren risiko">
        <OverviewTrendCard
          title="Tren Eksposur Risiko"
          chart={<TrendChartExample />}
          legend={
            <>
              <span>Aktual</span>
              <span>Target</span>
              <span>4 kuartal terakhir</span>
            </>
          }
        />
      </section>

      <section
        aria-label="Prioritas dan distribusi risiko"
        className="grid gap-4 pb-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
      >
        <OverviewTopRisksCard risks={designSystemOverviewTopRisks} />
        <Dialog>
          <div className="relative h-full">
            <StandardCard
              title="Peta Risiko Saat Ini"
              className="h-full rounded-lg"
              contentClassName="px-5 pb-6 pt-3"
              headerClassName="px-5 pb-3 pt-5"
            >
              <RiskHeatmapGrid
                matrix={fixtureMatrix()}
                label="Contoh peta risiko kuartal berjalan"
                className="mx-auto max-w-72"
              />
            </StandardCard>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Buka perbandingan heatmap multi-fase"
                className="absolute bottom-0 left-1/2 inline-flex size-9 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm outline-none transition-[color,background-color,box-shadow,transform] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none"
              >
                <ArrowExpand aria-hidden="true" className="size-4" />
              </button>
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-[min(96vw,1180px)] gap-4">
            <DialogHeader>
              <DialogTitle>Perbandingan Heatmap Multi-Fase</DialogTitle>
              <DialogDescription className="sr-only">
                Contoh perbandingan distribusi risiko dari skor awal hingga
                target skor.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-6">
              {["Skor Awal", "Kuartal 1", "Kuartal 2", "Kuartal 3", "Kuartal 4", "Target Skor"].map((label) => (
                <div key={label} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.6px] text-muted-foreground">
                    {label}
                  </p>
                  <RiskHeatmapGrid
                    matrix={fixtureMatrix()}
                    label={`Contoh heatmap ${label}`}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
