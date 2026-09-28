"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { IllustratedEmptyState } from "@/components/shared/design-system";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";

const chartConfig = {
  progressPercent: { label: "Progress", color: "oklch(0.72 0.17 155)" },
} satisfies ChartConfig;

type OrganizationLatestProgressChartProps = {
  data?: LatestOrganizationProgressDatum[];
};

export function OrganizationLatestProgressChart({
  data = [],
}: OrganizationLatestProgressChartProps) {
  const hasData = data.length > 0;

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="">
              Progress Kertas Kerja Terakhir
            </CardTitle>
            <p className="mt-1 text-xs text-secondary-foreground">
              Progress monitoring pada kertas kerja terbaru tiap organisasi.
            </p>
          </div>
          {hasData ? (
            <Badge variant="outline" className="">
              {data.length} organisasi
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <IllustratedEmptyState
            title="Belum ada data"
            description="Belum ada data progress organisasi untuk ditampilkan."
            size="compact"
            className="min-h-56"
          />
        ) : (
          <div className="h-64">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "oklch(0.6 0.02 265)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="orgName"
                  width={110}
                  tick={{ fontSize: 10, fill: "oklch(0.6 0.02 265)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const payload = item.payload as LatestOrganizationProgressDatum;
                        return (
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">{payload.orgName}: {value}%</span>
                            <span className="text-muted-foreground">{payload.progressCount}/{payload.totalCount} progres · {payload.period}</span>
                          </span>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="progressPercent" fill="var(--color-progressPercent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
