"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDashboardRiskCategoryData } from "@/lib/dashboard-insights";

type RiskCategoryDatum = ReturnType<typeof buildDashboardRiskCategoryData>;

interface RiskCategoryPieChartProps {
  data: RiskCategoryDatum;
  loading?: boolean;
  error?: boolean;
  cycle: string;
}

const COLORS = [
  "oklch(0.65 0.18 200)",
  "oklch(0.70 0.20 170)",
  "oklch(0.72 0.22 80)",
  "oklch(0.68 0.19 40)",
  "oklch(0.62 0.17 350)",
  "oklch(0.66 0.15 290)",
  "oklch(0.60 0.10 0)",
];

export function RiskCategoryPieChart({
  data,
  loading,
  error,
  cycle,
}: RiskCategoryPieChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.label,
        value: d.count,
      })),
    [data],
  );

  if (loading) {
    return (
      <Card className="h-full gap-4 rounded-lg border-0 bg-card py-0 shadow-none ring-1 ring-inset ring-border">
        <CardHeader className="pb-4 pt-4">
          <CardTitle className="text-sm font-semibold">
            Distribusi Kategori Risiko
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Memuat data kategori...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gap-4 rounded-lg border-0 bg-card py-0 shadow-none ring-1 ring-inset ring-border">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base font-medium">
          Distribusi Kategori Risiko
        </CardTitle>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Jumlah risiko per kategori pada cycle {cycle}.
        </p>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Data kategori risiko tidak tersedia saat ini.
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data kategori risiko.
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-56 shrink-0 sm:h-64">
              <ResponsiveContainer width={260} height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={88}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
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
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
