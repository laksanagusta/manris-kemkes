"use client";

import { useMemo } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  OverviewPanelState,
  OverviewTrendCard,
} from "@/components/shared/design-system";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
    color: "var(--color-blue-600)",
  },
  sangatRendah: {
    label: "Sangat Rendah",
    color: "var(--color-cyan-600)",
  },
  rendah: {
    label: "Rendah",
    color: "var(--color-green-600)",
  },
  sedang: {
    label: "Sedang",
    color: "var(--color-yellow-600)",
  },
  tinggi: {
    label: "Tinggi",
    color: "var(--color-orange-600)",
  },
  sangatTinggi: {
    label: "Sangat Tinggi",
    color: "var(--color-red-600)",
  },
} satisfies ChartConfig;

const riskLevelSeries = [
  { key: "sangatRendah", label: "Sangat Rendah", colorClassName: "bg-cyan-600" },
  { key: "rendah", label: "Rendah", colorClassName: "bg-green-600" },
  { key: "sedang", label: "Sedang", colorClassName: "bg-yellow-600" },
  { key: "tinggi", label: "Tinggi", colorClassName: "bg-orange-600" },
  { key: "sangatTinggi", label: "Sangat Tinggi", colorClassName: "bg-red-600" },
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
    <OverviewTrendCard
      title="Tren Jumlah Risiko"
      subtitle="Total risiko dan distribusi per level dalam 4 kuartal terakhir."
      legend={
        <>
          <span role="listitem" className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-blue-600" />
            Total risiko
          </span>
          {riskLevelSeries.map((series) => (
            <span key={series.key} role="listitem" className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${series.colorClassName}`}
              />
              {series.label}
            </span>
          ))}
        </>
      }
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
                  cursor={{ stroke: "var(--color-slate-400)" }}
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
    </OverviewTrendCard>
  );
}
