"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/chart-colors";
import type { CriticalRiskRateDatum } from "@/lib/dashboard-insights";
import { StandardCard } from "@/components/shared/design-system";

const RATE_COLOR = CHART_COLORS.primary;

const chartConfig = {
  highExtremeRate: {
    label: "Tingkat Kritis",
    color: RATE_COLOR,
  },
} satisfies ChartConfig;

interface CriticalRiskRateTrendProps {
  loading?: boolean;
  data?: CriticalRiskRateDatum[];
}

export function CriticalRiskRateTrend({
  loading,
  data = [],
}: CriticalRiskRateTrendProps) {
  const hasData = data.length > 0;
  const latestRate = hasData ? data[data.length - 1].highExtremeRate : 0;

  if (loading) {
    return (
      <StandardCard
        title="Tingkat Risiko Kritis"
        className="h-full"
        contentClassName="flex flex-col gap-4"
      >
        <div data-testid="critical-risk-rate-trend">
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Memuat...
          </div>
        </div>
      </StandardCard>
    );
  }

  return (
    <StandardCard
      title="Tingkat Risiko Kritis"
      action={
        hasData ? (
          <Badge variant="outline" className="h-5 px-2 text-[10px]">
            {latestRate}%
          </Badge>
        ) : null
      }
      className="h-full"
      contentClassName="flex flex-col gap-4"
    >
      <div data-testid="critical-risk-rate-trend">
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-surface-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data kuartal untuk menampilkan tren risiko kritis.
          </div>
        ) : (
          <>
            <div className="h-56">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ComposedChart
                  accessibilityLayer
                  data={data}
                  margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="critical-rate-gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={RATE_COLOR}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="100%"
                        stopColor={RATE_COLOR}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, (max: number) => Math.max(max + 10, 20)]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        formatter={(value, name) => {
                          if (name === "highExtremeRate") {
                            return [`${value ?? 0}%`, "Tingkat Kritis"];
                          }
                          return [`${value ?? 0}%`, String(name)];
                        }}
                        labelFormatter={(label) => {
                          const item = data.find((d) => d.period === label);
                          if (!item) return String(label);
                          return `${label} — ${item.mediumCount} sedang, ${item.highCount} tinggi, ${item.extremeCount} sangat tinggi dari ${item.totalRisks} total`;
                        }}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="highExtremeRate"
                    fill="url(#critical-rate-gradient)"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="highExtremeRate"
                    stroke="var(--color-highExtremeRate)"
                    strokeWidth={2.5}
                    dot={{
                      r: 4,
                      fill: "var(--color-highExtremeRate)",
                      strokeWidth: 2,
                      stroke: "var(--card)",
                    }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-border/40 pt-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: RATE_COLOR }}
                />
                <span className="text-[10px] text-muted-foreground">
                  % Sedang + Tinggi + Sangat Tinggi
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardCard>
  );
}
