"use client";

import {
  Line,
  LineChart,
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
import type { SemesterScoreTargetDatum } from "@/lib/dashboard-insights";
import { formatRiskScore } from "@/lib/risk";
import {
  ReportEmptyState,
  StandardCard,
} from "@/components/shared/design-system";

const ACTUAL_COLOR = CHART_COLORS.primary;
const TARGET_COLOR = CHART_COLORS.secondary;

const chartConfig = {
  actualScore: {
    label: "Skor aktual",
    color: ACTUAL_COLOR,
  },
  targetScore: {
    label: "Target",
    color: TARGET_COLOR,
  },
} satisfies ChartConfig;

interface SemesterTargetTrendProps {
  loading?: boolean;
  data?: SemesterScoreTargetDatum[];
}

export function SemesterTargetTrend({
  loading,
  data = [],
}: SemesterTargetTrendProps) {
  const hasData = data.length > 0;
  const latest = hasData ? data[data.length - 1] : null;

  if (loading) {
    return (
      <StandardCard
        title="Tren Skor Kuartal vs Target"
        className="h-full"
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-full flex-1 items-center justify-center rounded-lg bg-state-surface text-sm text-state-foreground">
          Memuat...
        </div>
      </StandardCard>
    );
  }

  return (
    <StandardCard
      title="Tren Skor Kuartal vs Target"
      action={
        latest ? (
          <Badge variant="outline" className="h-5 px-2 text-[10px]">
            {latest.period}
          </Badge>
        ) : null
      }
      className="h-full"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      {!hasData ? (
        <ReportEmptyState
          className="h-full flex-1"
          description="Belum ada data kuartal untuk menampilkan skor aktual dan target."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-56 flex-1">
            <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart
                  accessibilityLayer
                  data={data}
                  margin={{ top: 6, right: 18, left: -18, bottom: 0 }}
                >
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        formatter={(value, name) => {
                          if (name === "actualScore") {
                            return [
                              formatRiskScore(Number(value ?? 0), "—"),
                              "Skor aktual",
                            ];
                          }
                          if (name === "targetScore") {
                            return [
                              formatRiskScore(
                                typeof value === "number" ? value : null,
                              ),
                              "Target",
                            ];
                          }
                          return [
                            formatRiskScore(
                              typeof value === "number" ? value : null,
                            ),
                            String(name),
                          ];
                        }}
                        labelFormatter={(label) => {
                          const item = data.find((entry) => entry.period === label);
                          if (!item) return String(label);
                          return `${label} - ${item.riskCount} risiko`;
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="actualScore"
                    name="actualScore"
                    stroke={ACTUAL_COLOR}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetScore"
                    name="targetScore"
                    stroke={TARGET_COLOR}
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
            </ChartContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: ACTUAL_COLOR }}
              />
              Skor aktual
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: TARGET_COLOR }}
              />
              Target
            </span>
          </div>
        </div>
      )}
    </StandardCard>
  );
}
