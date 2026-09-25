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
import { ArrowExpand } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

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
        stroke="var(--color-blue-600)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 104 L92 110 L168 100 L244 108 L320 102" fill="none" stroke="var(--color-cyan-600)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 116 L92 124 L168 112 L244 120 L320 114" fill="none" stroke="var(--color-green-600)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 130 L92 134 L168 126 L244 132 L320 128" fill="none" stroke="var(--color-yellow-600)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 148 L92 142 L168 150 L244 144 L320 146" fill="none" stroke="var(--color-orange-600)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 160 L92 154 L168 162 L244 156 L320 158" fill="none" stroke="var(--color-red-600)" strokeWidth="2" strokeLinecap="round" />
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
              {[
                ["Total risiko", "bg-blue-600"],
                ["Sangat Rendah", "bg-cyan-600"],
                ["Rendah", "bg-green-600"],
                ["Sedang", "bg-yellow-600"],
                ["Tinggi", "bg-orange-600"],
                ["Sangat Tinggi", "bg-red-600"],
              ].map(([label, colorClass]) => (
                <span key={label} role="listitem" className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className={`size-2 rounded-full ${colorClass}`} />
                  {label}
                </span>
              ))}
            </>
          }
        />
      </section>

      <section
        aria-label="Prioritas dan distribusi risiko"
        className="grid items-start gap-4 pb-4 xl:items-stretch xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]"
      >
        <OverviewTopRisksCard risks={designSystemOverviewTopRisks} />
        <Dialog>
          <StandardCard
            title="Peta Risiko Saat Ini"
            subtitle="Distribusi probabilitas dan dampak pada kuartal berjalan."
            className="h-full"
            contentClassName="flex flex-1 flex-col"
            action={
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Buka perbandingan heatmap multi-fase"
                >
                  <ArrowExpand aria-hidden="true" />
                </Button>
              </DialogTrigger>
            }
          >
            <div className="flex flex-1 flex-col justify-center">
              <div className="mx-auto grid w-full max-w-[22rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                <span className="rotate-180 text-xs text-muted-foreground [writing-mode:vertical-rl]">
                  Probabilitas
                </span>
                <RiskHeatmapGrid
                  matrix={fixtureMatrix()}
                  label="Contoh peta risiko kuartal berjalan"
                  className="w-full"
                />
                <span aria-hidden="true" />
                <span className="text-center text-xs text-muted-foreground">
                  Dampak
                </span>
              </div>
              <div
                role="list"
                aria-label="Legenda level risiko"
                className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
              >
                {[
                  ["Sangat Rendah", "heatmap-sangat-rendah"],
                  ["Rendah", "heatmap-rendah"],
                  ["Sedang", "heatmap-sedang"],
                  ["Tinggi", "heatmap-tinggi"],
                  ["Sangat Tinggi", "heatmap-sangat-tinggi"],
                ].map(([label, className]) => (
                  <span key={label} role="listitem" className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-2.5 rounded-sm ${className}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </StandardCard>
          <DialogContent className="max-h-[90dvh] min-w-0 overflow-y-auto sm:max-w-[min(96vw,1480px)]">
            <DialogHeader className="pe-10">
              <DialogTitle>Perbandingan Heatmap Multi-Fase</DialogTitle>
              <DialogDescription>
                Bandingkan distribusi risiko dari skor awal, setiap kuartal, hingga target skor.
              </DialogDescription>
            </DialogHeader>
            <div role="region" aria-label="Perbandingan enam fase; geser mendatar untuk melihat fase berikutnya" tabIndex={0} className="min-w-0 overflow-x-auto pb-2">
              <div className="grid min-w-[1360px] grid-cols-6 gap-4">
                {["Skor Awal", "Kuartal 1", "Kuartal 2", "Kuartal 3", "Kuartal 4", "Target Skor"].map((label) => (
                  <div key={label} className="min-w-0 space-y-3 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {label}
                    </p>
                    <RiskHeatmapGrid
                      matrix={fixtureMatrix()}
                      label={`Contoh heatmap ${label}`}
                      className="mx-auto w-full max-w-56"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div
              role="list"
              aria-label="Legenda level risiko"
              className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground"
            >
              {[
                ["Sangat Rendah", "heatmap-sangat-rendah"],
                ["Rendah", "heatmap-rendah"],
                ["Sedang", "heatmap-sedang"],
                ["Tinggi", "heatmap-tinggi"],
                ["Sangat Tinggi", "heatmap-sangat-tinggi"],
              ].map(([label, className]) => (
                <span key={label} role="listitem" className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className={`size-2.5 rounded-sm ${className}`} />
                  {label}
                </span>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
