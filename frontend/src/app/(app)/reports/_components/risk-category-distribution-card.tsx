"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDashboardRiskCategoryData } from "@/lib/dashboard-insights";
import { RISK_CHART_COLORS } from "@/lib/chart-colors";

type RiskCategoryDatum = ReturnType<typeof buildDashboardRiskCategoryData>;

const chartConfig = {
  sangatRendah: {
    label: "Sangat Rendah",
    color: RISK_CHART_COLORS.veryLow,
  },
  rendah: { label: "Rendah", color: RISK_CHART_COLORS.low },
  sedang: { label: "Sedang", color: RISK_CHART_COLORS.medium },
  tinggi: { label: "Tinggi", color: RISK_CHART_COLORS.high },
  ekstrem: { label: "Sangat Tinggi", color: RISK_CHART_COLORS.extreme },
} satisfies ChartConfig;

interface RiskCategoryDistributionCardProps {
  data: RiskCategoryDatum;
  loading?: boolean;
  error?: boolean;
  cycle: string;
}

export function RiskCategoryDistributionCard({
  data,
  loading,
  error,
  cycle,
}: RiskCategoryDistributionCardProps) {
  if (loading) {
    return (
      <Card className="h-full rounded-xl bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium normal-case">
            Distribusi Kategori Risiko
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Memuat data kategori...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-xl bg-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium normal-case">
              Distribusi Kategori Risiko
            </CardTitle>
            <p className="mt-1 text-[11px] text-secondary-foreground">
              Jumlah risiko per kategori pada cycle {cycle}.
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground">{cycle}</span>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-surface-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Data kategori risiko tidak tersedia saat ini.
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-surface-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data kategori risiko.
          </div>
        ) : (
          <div className="h-72">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart
                accessibilityLayer
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name) => [
                        `${value ?? 0} risiko`,
                        String(name),
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="sangatRendah"
                  stackId="a"
                  fill="var(--color-sangatRendah)"
                  name="Sangat Rendah"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="rendah"
                  stackId="a"
                  fill="var(--color-rendah)"
                  name="Rendah"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="sedang"
                  stackId="a"
                  fill="var(--color-sedang)"
                  name="Sedang"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="tinggi"
                  stackId="a"
                  fill="var(--color-tinggi)"
                  name="Tinggi"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="ekstrem"
                  stackId="a"
                  fill="var(--color-ekstrem)"
                  name="Sangat Tinggi"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
