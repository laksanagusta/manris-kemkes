"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { StandardCard } from "@/components/shared/design-system";
import { OverviewPanelState } from "@/components/shared/design-system";
import { buildDashboardRiskCategoryData } from "@/lib/dashboard-insights";

type RiskCategoryDatum = ReturnType<typeof buildDashboardRiskCategoryData>;

interface RiskCategoryPieChartProps {
  data: RiskCategoryDatum;
  loading?: boolean;
  error?: boolean;
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.62 0.14 230)",
  "oklch(0.62 0.14 75)",
];

export function RiskCategoryPieChart({
  data,
  loading,
  error,
}: RiskCategoryPieChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.label,
        value: d.count,
      })),
    [data],
  );
  const totalRisks = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <StandardCard
      title="Distribusi Kategori Risiko"
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
        <div className="flex h-full flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="flex min-h-0 flex-1 items-center justify-center self-stretch sm:self-auto">
            <div
              role="img"
              aria-label={`Distribusi ${totalRisks} risiko dalam ${chartData.length} kategori`}
              className="relative w-full max-w-[240px] aspect-square"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                  <RechartsTooltip
                    formatter={(value, name) => [`${value} risiko`, name]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
            className="shrink-0 space-y-1.5"
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
    </StandardCard>
  );
}
