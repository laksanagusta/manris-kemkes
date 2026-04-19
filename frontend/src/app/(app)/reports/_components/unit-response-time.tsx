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
import type { UnitResponseTime } from "@/types/risk";

const MITIGATION_COLOR = "oklch(0.55 0.18 265)";
const APPROVAL_COLOR = "oklch(0.65 0.14 300)";

interface UnitResponseTimeChartProps {
  loading?: boolean;
  data?: UnitResponseTime[];
}

export function UnitResponseTimeChart({ loading, data = [] }: UnitResponseTimeChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((item) => item.taskCount > 0)
      .map((item) => ({
        orgName: item.orgName.length > 16 ? `${item.orgName.slice(0, 15)}…` : item.orgName,
        fullOrgName: item.orgName,
        avgMitigationDays: Number(item.avgMitigationDays.toFixed(1)),
        avgApprovalDays: Number(item.avgApprovalDays.toFixed(1)),
        taskCount: item.taskCount,
      }))
      .slice(0, 10);
  }, [data]);

  const hasData = chartData.length > 0;

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="unit-response-time">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Waktu Respons Unit</CardTitle>
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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="unit-response-time">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[15px] font-semibold">Waktu Respons Unit</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Rata-rata hari mitigasi dan persetujuan per organisasi
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data waktu respons unit.
          </div>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}d`}
                  />
                  <YAxis
                    type="category"
                    dataKey="orgName"
                    width={90}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} hari`,
                      name === "avgMitigationDays" ? "Rata-rata Penanganan" : "Rata-rata Persetujuan",
                    ]}
                    contentStyle={{
                      background: "oklch(0.15 0.02 265 / 95%)",
                      border: "1px solid oklch(0.3 0.03 265)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "oklch(0.9 0 0)",
                    }}
                    labelFormatter={(label) => chartData.find((d) => d.orgName === label)?.fullOrgName ?? label}
                  />
                  <Bar dataKey="avgMitigationDays" name="avgMitigationDays" fill={MITIGATION_COLOR} radius={[0, 3, 3, 0]} />
                  <Bar dataKey="avgApprovalDays" name="avgApprovalDays" fill={APPROVAL_COLOR} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-border/40 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-[3px]" style={{ background: MITIGATION_COLOR }} />
                <span className="text-[10px] text-muted-foreground">Rata-rata Penanganan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-[3px]" style={{ background: APPROVAL_COLOR }} />
                <span className="text-[10px] text-muted-foreground">Rata-rata Persetujuan</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
