"use client";

import { useMemo } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { StandardCard } from "@/components/shared/design-system";
import { OverviewPanelState } from "@/components/shared/design-system";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { RISK_CHART_COLORS } from "@/lib/chart-colors";
import { buildRiskCountTrendData } from "@/lib/dashboard-insights";
import { shiftAssessmentCycle } from "@/lib/risk-cycle-options";
import type { Risk } from "@/types/risk";

interface RiskCountTrendChartProps {
  risks: Risk[];
  currentCycle: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

function getLastNQuarters(currentCycle: string, n: number): string[] {
  return Array.from({ length: n }, (_, index) =>
    shiftAssessmentCycle(currentCycle, index - (n - 1)),
  );
}

const chartConfig = {
  totalRisks: {
    label: "Total Risiko",
    color: "var(--foreground)",
  },
  sangatRendah: {
    label: "Sangat Rendah",
    color: RISK_CHART_COLORS.veryLow,
  },
  rendah: {
    label: "Rendah",
    color: RISK_CHART_COLORS.low,
  },
  sedang: {
    label: "Sedang",
    color: RISK_CHART_COLORS.medium,
  },
  tinggi: {
    label: "Tinggi",
    color: RISK_CHART_COLORS.high,
  },
  sangatTinggi: {
    label: "Sangat Tinggi",
    color: RISK_CHART_COLORS.extreme,
  },
} satisfies ChartConfig;

const riskLevelSeries = [
  { key: "sangatRendah", label: "Sangat Rendah", color: RISK_CHART_COLORS.veryLow },
  { key: "rendah", label: "Rendah", color: RISK_CHART_COLORS.low },
  { key: "sedang", label: "Sedang", color: RISK_CHART_COLORS.medium },
  { key: "tinggi", label: "Tinggi", color: RISK_CHART_COLORS.high },
  { key: "sangatTinggi", label: "Sangat Tinggi", color: RISK_CHART_COLORS.extreme },
] as const;

export function RiskCountTrendChart({
  risks,
  currentCycle,
  loading,
  error,
  onRetry,
}: RiskCountTrendChartProps) {
  const chartData = useMemo(() => {
    const trend = buildRiskCountTrendData(risks);
    const periods = getLastNQuarters(currentCycle, 4);
    return periods.map((p) => {
      const found = trend.find((d) => d.period === p);
      return {
        period: p,
        totalRisks: found?.totalRisks ?? 0,
        sangatRendah: found?.sangatRendah ?? 0,
        rendah: found?.rendah ?? 0,
        sedang: found?.sedang ?? 0,
        tinggi: found?.tinggi ?? 0,
        sangatTinggi: found?.sangatTinggi ?? 0,
      };
    });
  }, [risks, currentCycle]);

  const hasData = chartData.some((d) => d.totalRisks > 0);

  return (
    <StandardCard
      title="Tren Jumlah Risiko"
      subtitle="Total risiko dan distribusi per level dalam 4 kuartal terakhir."
      className="rounded-lg"
      headerClassName="px-5 pb-3 pt-5"
      contentClassName="px-5 pb-5 pt-0"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat tren jumlah risiko..."
          className="min-h-80"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Tren jumlah risiko tidak dapat dimuat."
          className="min-h-80"
          onRetry={onRetry}
        />
      ) : !hasData ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data jumlah risiko untuk 4 kuartal terakhir."
          className="min-h-80"
        />
      ) : (
        <div>
          <div
            role="list"
            aria-label="Legenda tren jumlah risiko"
            className="mb-3 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            <span role="listitem" className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-6 rounded bg-foreground" />
              Total risiko
            </span>
            {riskLevelSeries.map((series) => (
              <span key={series.key} role="listitem" className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-0.5 w-6 rounded" style={{ backgroundColor: series.color }} />
                {series.label}
              </span>
            ))}
          </div>
          <div
            role="img"
            aria-label={`Grafik total risiko dan jumlah risiko per level dari ${chartData[0]?.period} sampai ${chartData.at(-1)?.period}`}
            className="h-72 w-full sm:h-80 lg:h-[22rem]"
          >
            <ChartContainer config={chartConfig} className="h-full w-full">
              <RechartsLineChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  width={32}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--chart-crosshair)" }}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name) => [
                        <span
                          key="value"
                          className="font-mono font-medium text-foreground tabular-nums"
                        >
                          {typeof value === "number" ? `${value} risiko` : "—"}
                        </span>,
                        <span key="label" className="text-muted-foreground">
                          {chartConfig[String(name) as keyof typeof chartConfig]?.label ?? String(name)}
                        </span>,
                      ]}
                      labelFormatter={(label) => `Kuartal ${label}`}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="totalRisks"
                  stroke="var(--color-totalRisks)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                {riskLevelSeries.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={`var(--color-${series.key})`}
                    strokeWidth={1.75}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </RechartsLineChart>
            </ChartContainer>
          </div>
          <ul className="sr-only">
            {chartData.map((item) => (
              <li key={item.period}>
                {item.period}: total risiko {item.totalRisks}; sangat rendah {item.sangatRendah}; rendah {item.rendah}; sedang {item.sedang}; tinggi {item.tinggi}; sangat tinggi {item.sangatTinggi}
              </li>
            ))}
          </ul>
        </div>
      )}
    </StandardCard>
  );
}
