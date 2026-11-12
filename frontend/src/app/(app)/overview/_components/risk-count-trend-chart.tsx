"use client";

import { MotionNumber } from "@/components/shared/design-system/motion/motion-primitives";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

interface RiskCountTrendChartProps {
  risks: Parameters<typeof buildRiskCountTrendData>[0];
  currentCycle: string;
  currentTotal?: number;
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
    color: "var(--workspace-data)",
  },
} satisfies ChartConfig;

export function RiskCountTrendChart({
  risks,
  currentCycle,
  currentTotal,
  loading,
  error,
  onRetry,
}: RiskCountTrendChartProps) {
  const gradientId = useId();
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
    <OverviewTrendCard
      title="Tren Jumlah Risiko"
      summary={
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            <MotionNumber value={currentTotal ?? "—"} />
          </span>
          <span className="text-sm text-muted-foreground">Risiko</span>
        </p>
      }
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat tren jumlah risiko..."
          className="min-h-64"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Tren jumlah risiko tidak dapat dimuat."
          className="min-h-64"
          onRetry={onRetry}
        />
      ) : !hasData ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data jumlah risiko untuk 4 kuartal terakhir."
          className="min-h-64"
        />
      ) : (
        <div>
          <div
            role="img"
            aria-label={`Tren jumlah total risiko dari ${chartData[0]?.period} sampai ${chartData.at(-1)?.period}`}
            className="h-64 w-full sm:h-[17rem]"
          >
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-totalRisks)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-totalRisks)" stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="period"
                  padding={{ left: 32, right: 32 }}
                  interval="preserveStartEnd"
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
                <Area
                  type="linear"
                  dataKey="totalRisks"
                  stroke="var(--color-totalRisks)"
                  strokeWidth={1.75}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
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
