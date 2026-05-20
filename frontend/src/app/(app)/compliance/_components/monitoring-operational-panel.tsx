"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { RiskHeatmap } from "../../overview/_components/risk-heatmap";
import { TopRisksPanel } from "../../overview/_components/top-risks-panel";
import { RiskMovementSnapshot } from "../../overview/_components/risk-movement-snapshot";
import type {
  DashboardActionPressurePoint,
  HeatmapVelocityCell,
  Risk,
  RiskCycleComparisonItem,
  TopRiskItem,
} from "@/types/risk";
import { buildMovementSnapshotData, type MovementSnapshotDatum } from "@/lib/dashboard-insights";
import { buildMonitoringMitigationSummary } from "@/lib/monitoring-mitigation-summary";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function previousGlobalCycle(cycle: string) {
  const [yearPart, half] = cycle.split("-");
  const year = Number(yearPart);
  if (half === "H1") return `${year - 1}-H2`;
  return `${year}-H1`;
}

function formatMonthPeriod(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date);
}

export function MonitoringOperationalPanel() {
  const { token } = useAuth();
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [velocityData, setVelocityData] = useState<HeatmapVelocityCell[]>([]);
  const [topRisks, setTopRisks] = useState<TopRiskItem[]>([]);
  const [movementSnapshot, setMovementSnapshot] = useState<
    MovementSnapshotDatum[]
  >([]);
  const [actionPressureData, setActionPressureData] = useState<
    DashboardActionPressurePoint[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [heatmapError, setHeatmapError] = useState(false);

  const cycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => previousGlobalCycle(cycle), [cycle]);

  useEffect(() => {
    if (!token) return;

    const buildHeatmapPath = (heatmapCycle: string) =>
      `/dashboard/heatmap?cycle=${heatmapCycle}`;

    Promise.allSettled([
      api.get<number[][]>(buildHeatmapPath(cycle), token),
      api.get<HeatmapVelocityCell[]>(
        `/dashboard/heatmap-velocity?from=${previousCycle}&to=${cycle}`,
        token,
      ),
      api.get<TopRiskItem[]>(`/dashboard/top-risks?cycle=${cycle}`, token),
      api.get<RiskCycleComparisonItem[]>(
        `/risks/compare?from=${previousCycle}&to=${cycle}`,
        token,
      ),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${cycle}`, token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${previousCycle}`, token),
      api.get<DashboardActionPressurePoint[]>(
        "/dashboard/action-pressure?interval=month&window=6",
        token,
      ),
    ]).then(
      ([
        heatmapResult,
        velocityResult,
        topRisksResult,
        comparisonsResult,
        currentRisksResult,
        previousRisksResult,
        actionPressureResult,
      ]) => {
        if (heatmapResult.status === "fulfilled") {
          setHeatmapData(heatmapResult.value);
          setHeatmapError(false);
        } else {
          console.error(heatmapResult.reason);
          setHeatmapData([]);
          setHeatmapError(true);
        }

        if (velocityResult.status === "fulfilled") {
          setVelocityData(velocityResult.value);
        } else {
          console.error(velocityResult.reason);
          setVelocityData([]);
        }

        if (topRisksResult.status === "fulfilled") {
          setTopRisks(topRisksResult.value);
        } else {
          console.error(topRisksResult.reason);
          setTopRisks([]);
        }

        if (
          comparisonsResult.status === "fulfilled" &&
          currentRisksResult.status === "fulfilled" &&
          previousRisksResult.status === "fulfilled"
        ) {
          setMovementSnapshot(
            buildMovementSnapshotData({
              currentRisks: currentRisksResult.value,
              previousRisks: previousRisksResult.value,
              comparisons: comparisonsResult.value,
            }),
          );
        } else {
          if (comparisonsResult.status === "rejected") console.error(comparisonsResult.reason);
          if (currentRisksResult.status === "rejected") console.error(currentRisksResult.reason);
          if (previousRisksResult.status === "rejected") console.error(previousRisksResult.reason);
          setMovementSnapshot([]);
        }

        if (actionPressureResult.status === "fulfilled") {
          setActionPressureData(actionPressureResult.value);
        } else {
          console.error(actionPressureResult.reason);
          setActionPressureData([]);
        }

        setLoading(false);
      },
    );
  }, [token, cycle, previousCycle]);

  const hasActionPressureData = actionPressureData.length > 0;
  const mitigationSummary = useMemo(
    () => buildMonitoringMitigationSummary(actionPressureData),
    [actionPressureData],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <RiskHeatmap
          data={heatmapData}
          loading={loading}
          error={heatmapError}
          velocityData={velocityData}
        />
        <TopRisksPanel risks={topRisks} loading={loading} />
      </div>

      <RiskMovementSnapshot data={movementSnapshot} loading={loading} />

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
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
                  <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Total mitigasi aktif
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {mitigationSummary.totalActive}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Total item mitigasi pada periode monitoring yang sedang dimuat.
                    </p>
                  </div>

                  <div className="rounded-xl border border-success/25 bg-success/10 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-success/80">
                      Mitigasi selesai
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {mitigationSummary.completed}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Item mitigasi yang sudah dituntaskan pada dataset saat ini.
                    </p>
                  </div>

                  <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-destructive/80">
                      Mitigasi overdue
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {mitigationSummary.overdue}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Item yang terlambat dan perlu tindak lanjut prioritas.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
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
