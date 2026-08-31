"use client";

import { useMemo } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
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
import { CHART_COLORS } from "@/lib/chart-colors";
import { buildSemesterScoreTargetTrendData } from "@/lib/dashboard-insights";
import { shiftAssessmentCycle } from "@/lib/risk-cycle-options";
import type { Risk } from "@/types/risk";

interface UnitTotalRiskScoreChartProps {
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
  actualScore: {
    label: "Skor Aktual",
    color: CHART_COLORS.primary,
  },
  targetScore: {
    label: "Skor Target",
    color: CHART_COLORS.secondary,
  },
} satisfies ChartConfig;

export function UnitTotalRiskScoreChart({
  risks,
  currentCycle,
  loading,
  error,
  onRetry,
}: UnitTotalRiskScoreChartProps) {
  const chartData = useMemo(() => {
    const trend = buildSemesterScoreTargetTrendData(risks);
    const periods = getLastNQuarters(currentCycle, 4);
    return periods.map((p) => {
      const found = trend.find((d) => d.period === p);
      return {
        period: p,
        actualScore: found?.actualScore ?? 0,
        targetScore: found?.targetScore ?? null,
      };
    });
  }, [risks, currentCycle]);

  const hasData = chartData.some((d) => d.actualScore > 0);

  return (
    <StandardCard
      title="Tren Skor Risiko per Kuartal"
      contentClassName="p-4 pt-2"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat tren skor risiko..."
          className="min-h-80"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Tren skor risiko tidak dapat dimuat."
          className="min-h-80"
          onRetry={onRetry}
        />
      ) : !hasData ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data tren untuk 4 kuartal terakhir."
          className="min-h-80"
        />
      ) : (
        <div>
          <div
            role="list"
            aria-label="Legenda tren skor"
            className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            <span role="listitem" className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-6 rounded bg-chart-1" />
              Skor aktual
            </span>
            <span role="listitem" className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="w-6 border-t-2 border-dashed border-chart-2" />
              Skor target
            </span>
          </div>
          <div
            role="img"
            aria-label={`Grafik skor aktual dan target dari ${chartData[0]?.period} sampai ${chartData.at(-1)?.period}`}
            className="h-72 w-full sm:h-80"
          >
            <ChartContainer config={chartConfig} className="h-full w-full">
              <RechartsLineChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                    vertical={false}
                />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
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
                        value ?? "—",
                        name === "actualScore" ? "Skor Aktual" : "Skor Target",
                      ]}
                      labelFormatter={(label) => `Kuartal ${label}`}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="actualScore"
                  stroke="var(--color-actualScore)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--color-actualScore)" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="targetScore"
                  stroke="var(--color-targetScore)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 3, fill: "var(--color-targetScore)" }}
                  connectNulls={false}
                />
              </RechartsLineChart>
            </ChartContainer>
          </div>
          <ul className="sr-only">
            {chartData.map((item) => (
              <li key={item.period}>
                {item.period}: skor aktual {item.actualScore}, skor target {item.targetScore ?? "belum tersedia"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </StandardCard>
  );
}
