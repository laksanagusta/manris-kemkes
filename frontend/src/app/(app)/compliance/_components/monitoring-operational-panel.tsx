"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import type {
  DashboardActionPressurePoint,
} from "@/types/risk";
import { buildMonitoringMitigationSummary } from "@/lib/monitoring-mitigation-summary";

function formatMonthPeriod(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date);
}

export function MonitoringOperationalPanel() {
  const { token } = useAuth();
  const [actionPressureData, setActionPressureData] = useState<
    DashboardActionPressurePoint[]
  >([]);

  useEffect(() => {
    if (!token) return;

    api.get<DashboardActionPressurePoint[]>(
      "/dashboard/action-pressure?interval=month&window=6",
      token,
    )
      .then((data) => {
        setActionPressureData(data);
      })
      .catch((error) => {
        console.error(error);
        setActionPressureData([]);
      });
  }, [token]);

  const hasActionPressureData = actionPressureData.length > 0;
  const mitigationSummary = useMemo(
    () => buildMonitoringMitigationSummary(actionPressureData),
    [actionPressureData],
  );

  return (
    <div className="space-y-4">
      <Card className="ring-1 ring-inset ring-border border-0 bg-card shadow-none">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-semibold">
              Progress Penanganan
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Distribusi mitigasi selesai dan overdue per bulan.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {hasActionPressureData ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={actionPressureData}
                    margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.5 0 0 / 8%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      tickFormatter={formatMonthPeriod}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      labelFormatter={(value) => formatMonthPeriod(String(value))}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Legend
                      iconType="square"
                      iconSize={10}
                      wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    />
                    <Bar
                      dataKey="mitigationsCompleted"
                      name="Penanganan Selesai"
                      fill="oklch(0.72 0.17 155)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="overdueMitigations"
                      name="Overdue"
                      fill="oklch(0.62 0.22 27)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <KpiCard
                    label="Total mitigasi aktif"
                    value={mitigationSummary.totalActive}
                    tone="white"
                    description="Total item mitigasi pada periode monitoring yang sedang dimuat."
                  />
                  <KpiCard
                    label="Mitigasi selesai"
                    value={mitigationSummary.completed}
                    tone="emerald"
                    description="Item mitigasi yang sudah dituntaskan pada dataset saat ini."
                  />
                  <KpiCard
                    label="Mitigasi overdue"
                    value={mitigationSummary.overdue}
                    tone="rose"
                    description="Item yang terlambat dan perlu tindak lanjut prioritas."
                  />
                </div>

                <div className="rounded-xl ring-1 ring-inset ring-border bg-background/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Completion rate
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Persentase mitigasi selesai dari total mitigasi aktif pada periode yang dimuat.
                      </p>
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      {mitigationSummary.completionRate}%
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[oklch(0.72_0.17_155)] transition-[width]"
                      style={{ width: `${mitigationSummary.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Data progress mitigasi belum tersedia untuk periode ini.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
