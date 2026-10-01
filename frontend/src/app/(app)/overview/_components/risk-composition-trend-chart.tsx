"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
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
import { RISK_CHART_COLORS } from "@/lib/chart-colors";
import { buildRiskCountTrendData } from "@/lib/dashboard-insights";
import { shiftAssessmentCycle } from "@/lib/risk-cycle-options";
import type { RiskCountTrendDatum } from "@/lib/dashboard-insights";
import type { Risk } from "@/types/risk";

const riskLevels = [
  {
    key: "sangatRendah",
    label: "Sangat Rendah",
    color: RISK_CHART_COLORS.veryLow,
  },
  { key: "rendah", label: "Rendah", color: RISK_CHART_COLORS.low },
  { key: "sedang", label: "Sedang", color: RISK_CHART_COLORS.medium },
  { key: "tinggi", label: "Tinggi", color: RISK_CHART_COLORS.high },
  {
    key: "sangatTinggi",
    label: "Sangat Tinggi",
    color: RISK_CHART_COLORS.extreme,
  },
] as const;

const chartConfig = {
  sangatRendah: {
    label: "Sangat Rendah",
    color: RISK_CHART_COLORS.veryLow,
  },
  rendah: { label: "Rendah", color: RISK_CHART_COLORS.low },
  sedang: { label: "Sedang", color: RISK_CHART_COLORS.medium },
  tinggi: { label: "Tinggi", color: RISK_CHART_COLORS.high },
  sangatTinggi: {
    label: "Sangat Tinggi",
    color: RISK_CHART_COLORS.extreme,
  },
} satisfies ChartConfig;

function getLastNQuarters(currentCycle: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftAssessmentCycle(currentCycle, index - (count - 1)),
  );
}

function emptyPeriod(period: string): RiskCountTrendDatum {
  return {
    period,
    totalRisks: 0,
    sangatRendah: 0,
    rendah: 0,
    sedang: 0,
    tinggi: 0,
    sangatTinggi: 0,
  };
}

export function RiskCompositionTrendChart({
  risks,
  currentCycle,
  loading,
  error,
  onRetry,
}: {
  risks: Risk[];
  currentCycle: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const chartData = useMemo(() => {
    const trend = new Map(
      buildRiskCountTrendData(risks).map((datum) => [datum.period, datum] as const),
    );
    return getLastNQuarters(currentCycle, 4).map(
      (period) => trend.get(period) ?? emptyPeriod(period),
    );
  }, [risks, currentCycle]);

  const hasData = chartData.some((datum) => datum.totalRisks > 0);
  const legend = (
    <>
      {riskLevels.map((level) => (
        <span
          key={level.key}
          role="listitem"
          className="inline-flex items-center gap-1.5"
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ backgroundColor: level.color }}
          />
          {level.label}
        </span>
      ))}
    </>
  );

  return (
    <OverviewTrendCard
      title="Komposisi Jumlah Risiko per Kuartal"
      legend={legend}
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat komposisi risiko..."
          className="min-h-64 xl:min-h-0 xl:flex-1"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Komposisi risiko tidak dapat dimuat."
          className="min-h-64 xl:min-h-0 xl:flex-1"
          onRetry={onRetry}
        />
      ) : !hasData ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data risiko untuk empat kuartal terakhir."
          className="min-h-64 xl:min-h-0 xl:flex-1"
        />
      ) : (
        <>
          <div
            role="img"
            aria-label={`Komposisi jumlah risiko menurut tingkat risiko dari ${chartData[0]?.period} sampai ${chartData.at(-1)?.period}`}
            className="h-72 w-full sm:h-80 xl:h-[24rem]"
          >
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 14 }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  width={32}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        <span
                          key="value"
                          className="font-mono font-medium text-foreground tabular-nums"
                        >
                          {typeof value === "number" ? `${value} risiko` : "—"}
                        </span>,
                        <span key="label" className="text-muted-foreground">
                          {chartConfig[
                            String(name) as keyof typeof chartConfig
                          ]?.label ?? String(name)}
                        </span>,
                      ]}
                      labelFormatter={(label, payload) => {
                        const period = payload[0]
                          ?.payload as RiskCountTrendDatum | undefined;
                        return `Kuartal ${String(label)} · ${period?.totalRisks ?? 0} risiko`;
                      }}
                    />
                  }
                />
                {riskLevels.map((level) => (
                  <Bar
                    key={level.key}
                    dataKey={level.key}
                    stackId="risk-level"
                    fill={`var(--color-${level.key})`}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>
          <ul className="sr-only">
            {chartData.map((datum) => (
              <li key={datum.period}>
                {datum.period}: total {datum.totalRisks} risiko; sangat rendah{" "}
                {datum.sangatRendah}; rendah {datum.rendah}; sedang {datum.sedang};
                tinggi {datum.tinggi}; sangat tinggi {datum.sangatTinggi}.
              </li>
            ))}
          </ul>
        </>
      )}
    </OverviewTrendCard>
  );
}
