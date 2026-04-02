"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Flame,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type {
  DashboardActionPressurePoint,
  ExecutiveAlert,
  Risk,
  RiskCycleComparisonItem,
} from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildExecutiveTrendData,
  buildMovementSnapshotData,
  buildUnitExposureData,
} from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";

const impactLabels = ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"];
const likelihoodLabels = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];

const levelColors: Record<string, string> = {
  low: "heatmap-low",
  medium: "heatmap-medium",
  high: "heatmap-high",
  extreme: "heatmap-extreme",
};

const executiveTrendLegend = [
  { key: "high", color: "oklch(0.70 0.18 40)", label: "High" },
  { key: "extreme", color: "oklch(0.62 0.22 27)", label: "Extreme" },
  { key: "exposureScore", color: "oklch(0.55 0.05 260 / 35%)", label: "Exposure Score" },
];

type DashboardSummary = {
  totalRisks: number;
  highExtreme: number;
  overdueMitigations: number;
  incidentsThisMonth: number;
};

type KpiCard = {
  title: string;
  value: number;
  change: string;
  trend: "up" | "down" | "stable";
  icon: typeof ShieldAlert;
  color: string;
  bgColor: string;
  description: string;
};

const alertMeta: Record<string, { label: string; className: string }> = {
  new_extreme: {
    label: "Baru Ekstrem",
    className: "border-risk-extreme/30 bg-risk-extreme/10 text-risk-extreme",
  },
  risk_up: {
    label: "Naik Level",
    className: "border-risk-high/30 bg-risk-high/10 text-risk-high",
  },
  mitigation_overdue: {
    label: "Mitigasi Overdue",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  unit_no_update: {
    label: "Belum Update",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
};

function getRiskLevel(prob: number, impact: number): string {
  const score = (prob + 1) * (impact + 1);
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 16) return "high";
  return "extreme";
}

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

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [allRisks, setAllRisks] = useState<Risk[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<Risk[]>([]);
  const [previousSnapshot, setPreviousSnapshot] = useState<Risk[]>([]);
  const [comparisons, setComparisons] = useState<RiskCycleComparisonItem[]>([]);
  const [trendData, setTrendData] = useState<Array<{ period: string; high: number; extreme: number; exposureScore: number }>>([]);
  const [actionPressureData, setActionPressureData] = useState<DashboardActionPressurePoint[]>([]);
  const [executiveAlerts, setExecutiveAlerts] = useState<ExecutiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => previousGlobalCycle(currentCycle), [currentCycle]);
  const unitExposureData = useMemo(() => buildUnitExposureData(allRisks, 5), [allRisks]);
  const movementSnapshotData = useMemo(
    () => buildMovementSnapshotData({ currentRisks: currentSnapshot, previousRisks: previousSnapshot, comparisons }),
    [currentSnapshot, previousSnapshot, comparisons],
  );

  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      api.get<DashboardSummary>("/dashboard/summary", token),
      api.get<number[][]>("/dashboard/heatmap", token),
      api.get<Risk[]>("/risks/trend", token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${currentCycle}`, token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${previousCycle}`, token),
      api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${currentCycle}`, token),
      api.get<DashboardActionPressurePoint[]>("/dashboard/action-pressure?interval=month&window=6", token),
      api.get<ExecutiveAlert[]>(`/dashboard/executive-alerts?cycle=${currentCycle}&limit=6`, token),
    ]).then(([
      summaryResult,
      heatmapResult,
      risksResult,
      currentSnapshotResult,
      previousSnapshotResult,
      comparisonResult,
      actionPressureResult,
      executiveAlertsResult,
    ]) => {
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      else console.error(summaryResult.reason);

      if (heatmapResult.status === "fulfilled") setHeatmapData(heatmapResult.value);
      else console.error(heatmapResult.reason);

      if (risksResult.status === "fulfilled") {
        setAllRisks(risksResult.value);
        setTrendData(buildExecutiveTrendData(risksResult.value));
      } else {
        console.error(risksResult.reason);
        setAllRisks([]);
        setTrendData([]);
      }

      if (currentSnapshotResult.status === "fulfilled") setCurrentSnapshot(currentSnapshotResult.value);
      else {
        console.error(currentSnapshotResult.reason);
        setCurrentSnapshot([]);
      }

      if (previousSnapshotResult.status === "fulfilled") setPreviousSnapshot(previousSnapshotResult.value);
      else {
        console.error(previousSnapshotResult.reason);
        setPreviousSnapshot([]);
      }

      if (comparisonResult.status === "fulfilled") setComparisons(comparisonResult.value);
      else {
        console.error(comparisonResult.reason);
        setComparisons([]);
      }

      if (actionPressureResult.status === "fulfilled") setActionPressureData(actionPressureResult.value);
      else {
        console.error(actionPressureResult.reason);
        setActionPressureData([]);
      }

      if (executiveAlertsResult.status === "fulfilled") setExecutiveAlerts(executiveAlertsResult.value);
      else {
        console.error(executiveAlertsResult.reason);
        setExecutiveAlerts([]);
      }

      setLoading(false);
    });
  }, [token, currentCycle, previousCycle]);

  const kpiCards: KpiCard[] = summary
    ? [
        {
          title: "Total Risiko",
          value: summary.totalRisks,
          change: "--",
          trend: "stable",
          icon: ShieldAlert,
          color: "text-chart-1",
          bgColor: "bg-chart-1/10",
          description: "risiko terdaftar",
        },
        {
          title: "Risiko Tinggi & Ekstrem",
          value: summary.highExtreme,
          change: "--",
          trend: "stable",
          icon: Flame,
          color: "text-risk-extreme",
          bgColor: "bg-risk-extreme/10",
          description: "memerlukan perhatian",
        },
        {
          title: "Mitigasi Overdue",
          value: summary.overdueMitigations,
          change: "--",
          trend: "stable",
          icon: Clock,
          color: "text-warning",
          bgColor: "bg-warning/10",
          description: "melewati tenggat",
        },
        {
          title: "Insiden Bulan Ini",
          value: summary.incidentsThisMonth,
          change: "--",
          trend: "stable",
          icon: AlertTriangle,
          color: "text-risk-high",
          bgColor: "bg-risk-high/10",
          description: "dilaporkan",
        },
      ]
    : [];

  if (loading) {
    return <div className="animate-pulse p-8 text-center text-muted-foreground">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Gambaran keseluruhan kondisi risiko organisasi</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-muted-foreground">Terakhir diperbarui: 10 Mar 2026, 23:45</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.title}
            className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight">{kpi.value}</span>
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        kpi.trend === "down"
                          ? "text-success"
                          : kpi.trend === "up"
                            ? "text-risk-high"
                            : "text-muted-foreground",
                      )}
                    >
                      {kpi.trend === "up" && <TrendingUp className="size-3" />}
                      {kpi.trend === "down" && <TrendingDown className="size-3" />}
                      {kpi.change}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">{kpi.description}</p>
                </div>
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    kpi.bgColor,
                  )}
                >
                  <kpi.icon className={cn("size-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Top 5 Unit by Exposure</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Ranking unit berdasarkan weighted exposure score saat ini.</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Top 5</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {unitExposureData.length > 0 ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={unitExposureData} margin={{ top: 8, right: 12, left: -24, bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
                      <XAxis
                        dataKey="orgName"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value: string) => value.length > 12 ? `${value.slice(0, 12)}…` : value}
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        formatter={(value) => [`${value ?? 0} poin`, "Exposure"]}
                        contentStyle={{
                          background: "oklch(0.98 0.003 170 / 95%)",
                          border: "1px solid oklch(0.91 0.008 170)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="exposureScore" fill="oklch(0.68 0.17 35)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {unitExposureData.slice(0, 3).map((item) => (
                    <div key={item.orgName} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <p className="truncate text-xs font-medium text-foreground">{item.orgName}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.extreme} ekstrem, {item.high} tinggi
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data unit untuk dihitung ranking eksposurnya.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Executive Alerts</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Ringkasan item yang butuh perhatian pimpinan pada cycle {currentCycle}.</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {executiveAlerts.length} alert
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {executiveAlerts.length > 0 ? (
              <div className="space-y-3">
                {executiveAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn("h-5 px-2 text-[10px]", alertMeta[alert.category]?.className || "")}
                      >
                        {alertMeta[alert.category]?.label || alert.category}
                      </Badge>
                      {alert.orgName ? (
                        <span className="truncate text-[10px] text-muted-foreground">{alert.orgName}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{alert.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada alert eksekutif untuk cycle ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Risk Trend</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Eksposur high/extreme per semester</p>
              </div>
              <div className="flex items-center gap-4">
                {executiveTrendLegend.map((item) => (
                  <div key={item.key} className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "oklch(0.15 0.02 265 / 95%)",
                        border: "1px solid oklch(0.3 0.03 265)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "oklch(0.9 0 0)",
                        backdropFilter: "blur(8px)",
                      }}
                    />
                    <Bar yAxisId="left" dataKey="high" fill="oklch(0.70 0.18 40)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="extreme" fill="oklch(0.62 0.22 27)" radius={[4, 4, 0, 0]} />
                    <Bar
                      yAxisId="right"
                      dataKey="exposureScore"
                      fill="oklch(0.55 0.05 260 / 35%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data semester untuk menghitung eksposur high dan extreme.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Incident vs Mitigation Closure</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Perbandingan insiden baru, mitigasi selesai, dan overdue per bulan.</p>
            </div>
          </CardHeader>
          <CardContent>
            {actionPressureData.length > 0 ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={actionPressureData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tickFormatter={formatMonthPeriod}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        labelFormatter={(value) => formatMonthPeriod(String(value))}
                        contentStyle={{
                          background: "oklch(0.98 0.003 170 / 95%)",
                          border: "1px solid oklch(0.91 0.008 170)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="incidentsCreated" name="Insiden dibuat" fill="oklch(0.70 0.18 40)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="mitigationsCompleted" name="Mitigasi selesai" fill="oklch(0.72 0.17 155)" radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="overdueMitigations"
                        name="Overdue"
                        stroke="oklch(0.68 0.18 70)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">Insiden</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {actionPressureData.reduce((sum, item) => sum + item.incidentsCreated, 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">Closed</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {actionPressureData.reduce((sum, item) => sum + item.mitigationsCompleted, 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">Overdue</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {actionPressureData.reduce((sum, item) => sum + item.overdueMitigations, 0)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Data incident dan closure mitigasi belum tersedia untuk periode ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Heatmap Risiko</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Distribusi risiko berdasarkan Probabilitas × Dampak</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                Detail
                <ArrowUpRight className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <div className="-mr-1 flex shrink-0 flex-col items-center justify-center">
                <span className="rotate-180 text-[9px] font-semibold tracking-widest text-muted-foreground [writing-mode:vertical-lr]">
                  PROBABILITAS
                </span>
              </div>

              <div className="flex shrink-0 flex-col justify-end gap-[3px] pb-[22px]">
                {[...likelihoodLabels].reverse().map((label) => (
                  <div key={label} className="flex h-0 flex-1 items-center justify-end pr-1.5">
                    <span className="w-10 truncate text-right text-[9px] leading-none text-muted-foreground">
                      {label.length > 8 ? `${label.slice(0, 7)}…` : label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="min-w-0 flex-1">
                <div className="grid grid-rows-5 gap-[3px]">
                  {[...heatmapData].reverse().map((row, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-5 gap-[3px]">
                      {row.map((count, colIdx) => {
                        const level = getRiskLevel(4 - rowIdx, colIdx);

                        return (
                          <div
                            key={colIdx}
                            className={cn(
                              "aspect-[4/3] cursor-pointer rounded-md text-xs font-bold transition-all hover:scale-[1.08] hover:shadow-md flex items-center justify-center",
                              levelColors[level],
                            )}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-5 gap-[3px]">
                  {impactLabels.map((label) => (
                    <div
                      key={label}
                      className="truncate text-center text-[9px] leading-tight text-muted-foreground"
                    >
                      {label.length > 8 ? `${label.slice(0, 7)}…` : label}
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-center text-[9px] font-semibold tracking-widest text-muted-foreground">
                  DAMPAK →
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 border-t border-border/40 pt-3">
              {[
                { label: "Rendah", cls: "heatmap-low" },
                { label: "Sedang", cls: "heatmap-medium" },
                { label: "Tinggi", cls: "heatmap-high" },
                { label: "Ekstrem", cls: "heatmap-extreme" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={cn("size-2.5 rounded-[3px]", item.cls)} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Risk Movement Snapshot</CardTitle>
              <Badge variant="outline" className="text-[10px]">{currentCycle}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {movementSnapshotData.some((item) => item.value > 0) ? (
              <div className="space-y-3">
                {movementSnapshotData.map((item) => (
                  <div key={item.key} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.label}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">Perubahan terhadap cycle sebelumnya</p>
                      </div>
                      <span className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Snapshot pergerakan risiko belum tersedia untuk perbandingan cycle ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
