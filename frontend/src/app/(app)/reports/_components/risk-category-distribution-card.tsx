"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDashboardRiskCategoryData } from "@/lib/dashboard-insights";

type RiskCategoryDatum = ReturnType<typeof buildDashboardRiskCategoryData>;

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
      <Card className="h-full border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
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
    <Card className="h-full border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Distribusi Kategori Risiko
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Jumlah risiko per kategori pada cycle {cycle}.
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground">{cycle}</span>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Data kategori risiko tidak tersedia saat ini.
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data kategori risiko.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.5 0 0 / 8%)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value, name) => [`${value} risiko`, name]}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--popover-foreground)",
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Bar
                  dataKey="sangatRendah"
                  stackId="a"
                  fill="oklch(0.72 0.17 155)"
                  name="Sangat Rendah"
                />
                <Bar
                  dataKey="rendah"
                  stackId="a"
                  fill="oklch(0.72 0.14 210)"
                  name="Rendah"
                />
                <Bar
                  dataKey="sedang"
                  stackId="a"
                  fill="oklch(0.75 0.15 75)"
                  name="Sedang"
                />
                <Bar
                  dataKey="tinggi"
                  stackId="a"
                  fill="oklch(0.70 0.18 40)"
                  name="Tinggi"
                />
                <Bar
                  dataKey="ekstrem"
                  stackId="a"
                  fill="oklch(0.62 0.22 27)"
                  name="Sangat Tinggi"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
