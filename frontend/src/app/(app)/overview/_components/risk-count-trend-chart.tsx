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
    color: "var(--color-violet-400)",
  },
} satisfies ChartConfig;

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
      };
    });
  }, [risks, currentCycle]);

  const hasData = chartData.some((d) => d.totalRisks > 0);

  return (
    <OverviewTrendCard title="Tren Jumlah Risiko">
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
            aria-label={`Tren jumlah total risiko dari ${chartData[0]?.period} sampai ${chartData.at(-1)?.period}`}
            className="h-72 w-full sm:h-80 xl:h-[27rem]"
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
                  tick={{ fontSize: 14 }}
                />
                <YAxis
                  allowDecimals={false}
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
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
                  dot={false}
                  activeDot={false}
                />
              </RechartsLineChart>
            </ChartContainer>
          </div>
          <ul className="sr-only">
            {chartData.map((item) => (
              <li key={item.period}>
                {item.period}: total risiko {item.totalRisks}
              </li>
            ))}
          </ul>
        </div>
      )}
    </OverviewTrendCard>
  );
}
