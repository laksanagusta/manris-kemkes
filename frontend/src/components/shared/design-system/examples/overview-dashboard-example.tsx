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
      aria-label="Line chart contoh untuk tren jumlah risiko dan level risiko"
    >
      <g fill="none" stroke="oklch(0.5 0 0 / 10%)" strokeWidth="1">
        <path d="M16 36 H344" />
        <path d="M16 72 H344" />
        <path d="M16 108 H344" />
        <path d="M16 144 H344" />
      </g>
      <path
        d="M16 48 L92 42 L168 58 L244 44 L320 52"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 116 L92 124 L168 112 L244 120 L320 114" fill="none" stroke="var(--risk-low)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 130 L92 134 L168 126 L244 132 L320 128" fill="none" stroke="var(--risk-medium)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 148 L92 142 L168 150 L244 144 L320 146" fill="none" stroke="var(--risk-high)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 160 L92 154 L168 162 L244 156 L320 158" fill="none" stroke="var(--risk-extreme)" strokeWidth="2" strokeLinecap="round" />
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
          title="Tren Jumlah Risiko"
          chart={<TrendChartExample />}
          legend={
            <>
              <span>Total risiko</span>
              <span>Sangat Rendah</span>
              <span>Rendah</span>
              <span>Sedang</span>
              <span>Tinggi</span>
              <span>Sangat Tinggi</span>
            </>
          }
        />
      </section>

      <section
        aria-label="Prioritas dan distribusi risiko"
        className="grid items-start gap-4 pb-4 xl:items-stretch xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
      >
        <OverviewTopRisksCard risks={designSystemOverviewTopRisks} />
        <Dialog>
          <div className="relative xl:h-full">
            <StandardCard
              title="Peta Risiko Saat Ini"
              className="rounded-lg xl:h-full"
              contentClassName="px-5 pb-6 pt-3 xl:flex xl:flex-1 xl:flex-col xl:pb-3 xl:pt-2"
              headerClassName="px-5 pb-3 pt-5 xl:!pb-2 xl:pt-4"
            >
              <RiskHeatmapGrid
                matrix={fixtureMatrix()}
                label="Contoh peta risiko kuartal berjalan"
                className="mx-auto w-full max-w-72 xl:max-w-[287px]"
              />
              <div
                role="list"
                aria-label="Legenda level risiko"
                className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[10px] text-muted-foreground xl:mt-2"
              >
                {[
                  ["Sangat Rendah", "heatmap-sangat-rendah"],
                  ["Rendah", "heatmap-rendah"],
                  ["Sedang", "heatmap-sedang"],
                  ["Tinggi", "heatmap-tinggi"],
                  ["Sangat Tinggi", "heatmap-sangat-tinggi"],
                ].map(([label, className]) => (
                  <span key={label} role="listitem" className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-2 rounded-sm ${className}`} />
                    {label}
                  </span>
                ))}
              </div>
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
