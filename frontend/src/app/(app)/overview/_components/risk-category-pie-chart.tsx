"use client";

import { useMemo, useState } from "react";
import { Pie, PieChart, Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";
import { Badge } from "@/components/ui/badge";
import {
  OverviewPanelState,
  StandardCard,
} from "@/components/shared/design-system";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { buildDashboardRiskCategoryData } from "@/lib/dashboard-insights";
import { riskCategoryColors, riskCategoryLabels } from "@/lib/risk";

type RiskCategoryDatum = ReturnType<typeof buildDashboardRiskCategoryData>;

interface RiskCategoryPieChartProps {
  data: RiskCategoryDatum;
  loading?: boolean;
  error?: boolean;
  cycle?: string;
  onRetry?: () => void;
}

const FALLBACK_CATEGORY_COLOR = "var(--muted-foreground)";

function normalizeCategory(value: string) {
  return value.trim().toLowerCase().replace(/[\s/_-]+/g, "");
}

function getRiskCategoryColor(label: string) {
  const normalizedLabel = normalizeCategory(label);
  const match = Object.entries(riskCategoryLabels).find(
    ([key, categoryLabel]) =>
      key &&
      (normalizeCategory(key) === normalizedLabel ||
        normalizeCategory(categoryLabel) === normalizedLabel),
  );

  return match
    ? riskCategoryColors[
        match[0] as keyof typeof riskCategoryColors
      ]
    : FALLBACK_CATEGORY_COLOR;
}

const chartConfig = {
  value: {
    label: "Risiko",
    color: FALLBACK_CATEGORY_COLOR,
  },
} satisfies ChartConfig;

export function RiskCategoryPieChart({
  data,
  loading,
  error,
  cycle,
  onRetry,
}: RiskCategoryPieChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const totalRisks = useMemo(
    () => data.reduce((total, item) => total + item.count, 0),
    [data],
  );
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        name: item.label,
        value: item.count,
        fill: getRiskCategoryColor(item.label),
        percentage: totalRisks ? (item.count / totalRisks) * 100 : 0,
      })),
    [data, totalRisks],
  );
  const selectedIndex = chartData.findIndex(
    (item) => item.name === selectedCategory,
  );
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  return (
    <StandardCard
      title={<span className="text-sm">Distribusi Kategori Risiko</span>}
      action={cycle ? <Badge variant="outline">{cycle}</Badge> : undefined}
      className="h-full"
      contentClassName="flex min-h-0 flex-1 flex-col gap-4 pt-0"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat distribusi kategori..."
          className="h-full flex-1"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Distribusi kategori tidak dapat dimuat."
          className="h-full flex-1"
          onRetry={onRetry}
        />
      ) : chartData.length === 0 ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data kategori risiko."
          className="h-full flex-1"
        />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div
              role="group"
              aria-label={`Diagram donat: ${totalRisks} risiko dalam ${chartData.length} kategori`}
              className="aspect-square w-full max-w-[250px]"
            >
              <ChartContainer
                config={chartConfig}
                className="mx-auto size-full max-h-[250px] max-w-[250px] aspect-square"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="48%"
                    outerRadius="80%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={5}
                    onClick={(_, index) => {
                      setSelectedCategory(chartData[index]?.name ?? null);
                    }}
                    shape={(props: PieSectorShapeProps) => {
                      const { index, outerRadius = 0, ...sectorProps } = props;

                      return (
                        <Sector
                          {...sectorProps}
                          outerRadius={
                            index === activeIndex ? outerRadius + 10 : outerRadius
                          }
                        />
                      );
                    }}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          </div>

          <div
            role="group"
            aria-label="Pilih kategori risiko"
            className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2 border-t border-surface-border/60 pt-3"
          >
            {chartData.map((item, index) => {
              const isSelected = index === activeIndex;
              const percentage = item.percentage.toLocaleString("id-ID", {
                maximumFractionDigits: 1,
              });

              return (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.name}, ${percentage} persen, ${item.value} risiko`}
                  onClick={() => setSelectedCategory(item.name)}
                  className={`min-w-0 rounded-xl p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isSelected
                      ? "bg-muted"
                      : "hover:bg-muted/60 active:bg-muted"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="mt-2 block text-lg font-semibold tracking-tight text-foreground tabular-nums">
                    {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </StandardCard>
  );
}
