"use client";

import { useMemo } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StandardCard } from "@/components/shared/design-system";
import { OverviewPanelState } from "@/components/shared/design-system";
import { buildSemesterScoreTargetTrendData } from "@/lib/dashboard-insights";
import type { Risk } from "@/types/risk";

interface UnitTotalRiskScoreChartProps {
  risks: Risk[];
  currentCycle: string;
  loading?: boolean;
  error?: boolean;
}

function getLastNSemesters(currentCycle: string, n: number): string[] {
  const [yearStr, half] = currentCycle.split("-");
  let year = Number(yearStr);
  let h = half === "H1" ? 1 : 2;
  const semesters: string[] = [];
  for (let i = 0; i < n; i++) {
    semesters.unshift(`${year}-${h === 1 ? "H1" : "H2"}`);
    h = h === 1 ? 2 : 1;
    if (h === 2) year -= 1;
  }
  return semesters;
}

export function UnitTotalRiskScoreChart({
  risks,
  currentCycle,
  loading,
  error,
}: UnitTotalRiskScoreChartProps) {
  const chartData = useMemo(() => {
    const trend = buildSemesterScoreTargetTrendData(risks);
    const periods = getLastNSemesters(currentCycle, 4);
    return periods.map((p) => {
      const found = trend.find((d) => d.period === p);
      return {
        period: p,
        actualScore: found?.actualScore ?? 0,
        targetScore: found?.targetScore ?? 0,
      };
    });
  }, [risks, currentCycle]);

  const hasData = chartData.some((d) => d.actualScore > 0);

  return (
    <StandardCard
      title="Tren Skor Risiko per Semester"
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
        />
      ) : !hasData ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data tren untuk 4 semester terakhir."
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
              <span aria-hidden="true" className="h-0.5 w-6 rounded bg-[oklch(0.72_0.13_190)]" />
              Skor aktual
            </span>
            <span role="listitem" className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="w-6 border-t-2 border-dashed border-[oklch(0.82_0.08_190)]" />
              Skor target
            </span>
          </div>
          <div
            role="img"
            aria-label={`Grafik skor aktual dan target dari ${chartData[0]?.period} sampai ${chartData.at(-1)?.period}`}
            className="h-72 w-full sm:h-80"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.5 0 0 / 8%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                />
                <YAxis
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                  width={32}
                />
                <RechartsTooltip
                  cursor={{ stroke: "oklch(0.5 0 0 / 12%)" }}
                  formatter={(value, name) => [
                    value,
                    name === "actualScore" ? "Skor Aktual" : "Skor Target",
                  ]}
                  labelFormatter={(label) => `Semester ${label}`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actualScore"
                  stroke="oklch(0.72 0.13 190)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "oklch(0.72 0.13 190)" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="targetScore"
                  stroke="oklch(0.82 0.08 190)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 3, fill: "oklch(0.82 0.08 190)" }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only">
            {chartData.map((item) => (
              <li key={item.period}>
                {item.period}: skor aktual {item.actualScore}, skor target {item.targetScore}
              </li>
            ))}
          </ul>
        </div>
      )}
    </StandardCard>
  );
}
