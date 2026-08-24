"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";

const PROGRESS_COLOR = "oklch(0.72 0.17 155)";

type OrganizationLatestProgressChartProps = {
  data?: LatestOrganizationProgressDatum[];
};

export function OrganizationLatestProgressChart({
  data = [],
}: OrganizationLatestProgressChartProps) {
  const hasData = data.length > 0;

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium normal-case">
              Progress Kertas Kerja Terakhir
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Progress monitoring pada kertas kerja terbaru tiap organisasi.
            </p>
          </div>
          {hasData ? (
            <Badge variant="outline" className="text-[10px]">
              {data.length} organisasi
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data progress organisasi untuk ditampilkan.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
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
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item.payload as LatestOrganizationProgressDatum;
                    return [
                      `${value}%`,
                      `${payload.progressCount}/${payload.totalCount} progres · ${payload.period}`,
                    ];
                  }}
                  contentStyle={{
                    background: "oklch(0.98 0.003 170 / 95%)",
                    border: "1px solid oklch(0.91 0.008 170)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="progressPercent" fill={PROGRESS_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
