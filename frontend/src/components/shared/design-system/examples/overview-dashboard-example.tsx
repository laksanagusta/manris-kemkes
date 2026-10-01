import {
  DashboardKpiCard,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  MetricGrid,
  OverviewTrendCard,
  RiskHeatmapGrid,
  StandardCard,
} from "@/components/shared/design-system";
import { ArrowExpand } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

import {
  designSystemCurrentRiskMatrix,
  designSystemOverviewDashboardKpis,
} from "../data/overview-fixtures";
import { RISK_CHART_COLORS } from "@/lib/chart-colors";

const fixtureMatrix = () =>
  designSystemCurrentRiskMatrix.map((row) => [...row]);

function TrendChartExample() {
  return (
    <svg
      viewBox="0 0 360 180"
      className="h-64 w-full"
      role="img"
      aria-label="Line chart contoh satu seri untuk tren jumlah risiko"
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
        stroke="var(--color-violet-400)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const compositionLevels = [
  { label: "Sangat Rendah", color: RISK_CHART_COLORS.veryLow },
  { label: "Rendah", color: RISK_CHART_COLORS.low },
  { label: "Sedang", color: RISK_CHART_COLORS.medium },
  { label: "Tinggi", color: RISK_CHART_COLORS.high },
  { label: "Sangat Tinggi", color: RISK_CHART_COLORS.extreme },
] as const;

const compositionPeriods = [
  { period: "2025-Q4", values: [6, 11, 7, 5, 3] },
  { period: "2026-Q1", values: [5, 12, 8, 6, 3] },
  { period: "2026-Q2", values: [4, 11, 10, 7, 4] },
  { period: "2026-Q3", values: [3, 10, 10, 8, 6] },
] as const;

function RiskCompositionChartExample() {
  const baseline = 158;
  const scale = 3.2;
  const yTicks = [0, 10, 20, 30, 40];

  return (
    <svg
      viewBox="0 0 360 192"
      className="h-64 w-full"
      role="img"
      aria-label="Contoh batang bertumpuk yang membandingkan komposisi lima tingkat risiko pada empat kuartal"
    >
      <g fill="none" stroke="var(--border)" strokeDasharray="3 3">
        {yTicks.map((tick) => {
          const y = baseline - tick * scale;
          return <path key={tick} d={`M36 ${y} H350`} />;
        })}
      </g>
      <g fill="var(--muted-foreground)" fontSize="12" textAnchor="end">
        {yTicks.map((tick) => {
          const y = baseline - tick * scale + 3;
          return (
            <text key={tick} x="30" y={y}>
              {tick}
            </text>
          );
        })}
      </g>
      {compositionPeriods.map((item, periodIndex) => {
        let top = baseline;
        const x = 52 + periodIndex * 76;

        return (
          <g key={item.period}>
            {compositionLevels.map((level, levelIndex) => {
              const value = item.values[levelIndex] ?? 0;
              const height = value * scale;
              top -= height;
              return (
                <rect
                  key={level.label}
                  x={x}
                  y={top}
                  width="40"
                  height={height}
                  fill={level.color}
                />
              );
            })}
            <text
              x={x + 20}
              y="180"
              fill="var(--muted-foreground)"
              fontSize="14"
              textAnchor="middle"
            >
              {item.period}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RiskCompositionExample() {
  return (
    <OverviewTrendCard
      title="Komposisi Jumlah Risiko per Kuartal"
      legend={
        <>
          {compositionLevels.map((level) => (
            <span
              key={level.label}
              role="listitem"
              className="inline-flex items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: level.color }}
              />
              {level.label}
            </span>
          ))}
        </>
      }
    >
      <RiskCompositionChartExample />
    </OverviewTrendCard>
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
        />
      </section>

      <section
        aria-label="Komposisi risiko dan peta risiko saat ini"
        className="grid items-start gap-4 pb-4 xl:items-stretch xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]"
      >
        <div className="flex min-h-0 min-w-0 w-full xl:h-[32rem] [&>*]:h-full [&>*]:w-full">
          <RiskCompositionExample />
        </div>
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
