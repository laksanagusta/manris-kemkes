"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  Badge,
  OverviewPanelState,
  ReportPanel,
} from "@/components/shared/design-system";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { buildDashboardRiskCategoryData } from "@/lib/dashboard-insights";
import { CHART_COLORS } from "@/lib/chart-colors";

type RiskCategoryDatum = ReturnType<typeof buildDashboardRiskCategoryData>;

interface RiskCategoryPieChartProps {
  data: RiskCategoryDatum;
  loading?: boolean;
  error?: boolean;
  cycle?: string;
}

const COLORS = Object.values(CHART_COLORS);

const chartConfig = {
  value: {
    label: "Risiko",
    color: CHART_COLORS.primary,
  },
} satisfies ChartConfig;

export function RiskCategoryPieChart({
  data,
  loading,
  error,
  cycle,
}: RiskCategoryPieChartProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        name: item.label,
        value: item.count,
      })),
    [data],
  );
  const totalRisks = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ReportPanel
      title="Distribusi Kategori Risiko"
      actions={
        cycle ? (
          <Badge variant="outline" className="h-5 px-2 text-[10px]">
            {cycle}
          </Badge>
        ) : undefined
      }
      className="h-full"
      contentClassName="flex flex-1 flex-col p-4 pt-2"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat distribusi kategori..."
          className="min-h-48"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Distribusi kategori tidak dapat dimuat."
          className="min-h-48"
        />
      ) : chartData.length === 0 ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data kategori risiko."
          className="min-h-48"
        />
      ) : (
        <div className="flex h-full flex-col items-center gap-4">
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <div
              role="img"
              aria-label={`Distribusi ${totalRisks} risiko dalam ${chartData.length} kategori`}
              className="relative aspect-square w-full max-w-[240px]"
            >
              <ChartContainer config={chartConfig} className="size-full">
                <PieChart accessibilityLayer>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="78%"
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, name) => [
                          `${value ?? 0} risiko`,
                          String(name),
                        ]}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <div className="text-center">
                  <p className="text-2xl font-mono font-semibold tracking-tight text-foreground tabular-nums">
                    {totalRisks}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    risiko
                  </p>
                </div>
              </div>
            </div>
          </div>
          <ul
            aria-label="Legenda kategori risiko"
            className="grid w-full shrink-0 grid-cols-2 gap-x-4 gap-y-2 border-t border-surface-border/60 pt-3 sm:grid-cols-3"
          >
            {chartData.map((item, index) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ReportPanel>
  );
}
