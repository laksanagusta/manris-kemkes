"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OverdueMitigationTimelineItem } from "@/types/risk";

const COLORS = {
  onTime: "oklch(0.72 0.17 155)",
  overdue7: "oklch(0.78 0.16 85)",
  overdue30: "oklch(0.70 0.18 40)",
  overdue30Plus: "oklch(0.62 0.22 27)",
};

const LEGEND = [
  { label: "Tepat Waktu", color: COLORS.onTime },
  { label: "≤7 hari", color: COLORS.overdue7 },
  { label: "≤30 hari", color: COLORS.overdue30 },
  { label: ">30 hari", color: COLORS.overdue30Plus },
];

interface OverdueMitigationTimelineProps {
  loading?: boolean;
  data?: OverdueMitigationTimelineItem[];
}

export function OverdueMitigationTimeline({ loading, data = [] }: OverdueMitigationTimelineProps) {
  const chartData = useMemo(() => {
    return data
      .filter((item) => item.totalCount > 0)
      .map((item) => ({
        orgName: item.orgName.length > 16 ? `${item.orgName.slice(0, 15)}…` : item.orgName,
        fullOrgName: item.orgName,
        onTimeCount: item.onTimeCount,
        overdue7Count: item.overdue7Count,
        overdue30Count: item.overdue30Count,
        overdue30PlusCount: item.overdue30PlusCount,
      }))
      .slice(0, 10);
  }, [data]);

  const hasData = chartData.length > 0;

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="overdue-mitigation-timeline">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Timeline Penanganan Overdue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Memuat...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="overdue-mitigation-timeline">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Timeline Penanganan Overdue</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Jumlah mitigasi per organisasi berdasarkan kedatanggal pengaporan
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data timeline mitigasi overdue.
          </div>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="orgName"
                    width={90}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${value}`, name]}
                    contentStyle={{
                      background: "oklch(0.15 0.02 265 / 95%)",
                      border: "1px solid oklch(0.3 0.03 265)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "oklch(0.9 0 0)",
                    }}
                    labelFormatter={(label) => chartData.find((d) => d.orgName === label)?.fullOrgName ?? label}
                  />
                  <Bar dataKey="onTimeCount" stackId="a" fill={COLORS.onTime} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue7Count" stackId="a" fill={COLORS.overdue7} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue30Count" stackId="a" fill={COLORS.overdue30} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue30PlusCount" stackId="a" fill={COLORS.overdue30Plus} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-border/40 pt-3">
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-[3px]" style={{ background: item.color }} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
