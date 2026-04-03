"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileBarChart,
  Flame,
  Gauge,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
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
import { RiskHeatmap } from "./_components/risk-heatmap";
import { TopRisksPanel } from "./_components/top-risks-panel";
import { RiskMovementSnapshot } from "./_components/risk-movement-snapshot";
import type {
  DashboardActionPressurePoint,
  DashboardRiskCategoryItem,
  ExecutiveAlert,
  HeatmapVelocityCell,
  Risk,
  RiskCycleComparisonItem,
  TopRiskItem,
} from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildDashboardRiskCategoryData,
  buildExecutiveTrendData,
  buildMovementSnapshotData,
  levelFromScore,
  weightFor,
} from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";

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

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
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
  const [trendData, setTrendData] = useState<Array<{ period: string; high: number; extreme: number; exposureScore: number }>>([]);
  const [actionPressureData, setActionPressureData] = useState<DashboardActionPressurePoint[]>([]);
  const [executiveAlerts, setExecutiveAlerts] = useState<ExecutiveAlert[]>([]);
  const [riskCategoryData, setRiskCategoryData] = useState<{ label: string; count: number }[]>([]);
  const [isRiskCategoryLoading, setIsRiskCategoryLoading] = useState(true);
  const [riskCategoryError, setRiskCategoryError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topRisks, setTopRisks] = useState<TopRiskItem[]>([]);
  const [movementSnapshot, setMovementSnapshot] = useState<ReturnType<typeof buildMovementSnapshotData>>([]);
  const [allRisksForExposure, setAllRisksForExposure] = useState<Risk[]>([]);
  const [exposureScore, setExposureScore] = useState(0);
  const [velocityData, setVelocityData] = useState<HeatmapVelocityCell[]>([]);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => {
    const [yearStr, half] = currentCycle.split("-");
    const year = Number(yearStr);
    if (half === "H1") return `${year - 1}-H2`;
    return `${year}-H1`;
  }, [currentCycle]);

  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      api.get<DashboardSummary>("/dashboard/summary", token),
      api.get<number[][]>("/dashboard/heatmap", token),
      api.get<Risk[]>("/risks/trend", token),
      api.get<DashboardActionPressurePoint[]>("/dashboard/action-pressure?interval=month&window=6", token),
      api.get<ExecutiveAlert[]>(`/dashboard/executive-alerts?cycle=${currentCycle}&limit=6`, token),
      api.get<DashboardRiskCategoryItem[]>("/dashboard/risk-categories", token),
      api.get<TopRiskItem[]>("/dashboard/top-risks", token),
      api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${currentCycle}`, token),
      api.get<HeatmapVelocityCell[]>(`/dashboard/heatmap-velocity?from=${previousCycle}&to=${currentCycle}`, token),
    ]).then(([
      summaryResult,
      heatmapResult,
      risksResult,
      actionPressureResult,
      executiveAlertsResult,
      riskCategoryResult,
      topRisksResult,
      compareResult,
      velocityResult,
    ]) => {
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      else console.error(summaryResult.reason);

      if (heatmapResult.status === "fulfilled") setHeatmapData(heatmapResult.value);
      else console.error(heatmapResult.reason);

      if (risksResult.status === "fulfilled") {
        const risks = risksResult.value;
        setAllRisksForExposure(risks);
        setTrendData(buildExecutiveTrendData(risks));
        const score = risks.reduce((sum, r) => {
          const lvl = levelFromScore(r.probability, r.impact);
          return sum + weightFor(lvl);
        }, 0);
        setExposureScore(score);
      } else {
        console.error(risksResult.reason);
        setTrendData([]);
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

      if (riskCategoryResult.status === "fulfilled") {
        setRiskCategoryData(buildDashboardRiskCategoryData(riskCategoryResult.value));
        setRiskCategoryError(false);
      } else {
        console.error(riskCategoryResult.reason);
        setRiskCategoryData([]);
        setRiskCategoryError(true);
      }
      setIsRiskCategoryLoading(false);

      if (topRisksResult.status === "fulfilled") setTopRisks(topRisksResult.value);
      else { console.error(topRisksResult.reason); setTopRisks([]); }

      if (compareResult.status === "fulfilled") {
        const comparisons = compareResult.value;
        const risks = risksResult.status === "fulfilled" ? risksResult.value : [];
        setMovementSnapshot(buildMovementSnapshotData({
          currentRisks: risks,
          previousRisks: [],
          comparisons,
        }));
      } else {
        console.error(compareResult.reason);
        setMovementSnapshot([]);
      }

      if (velocityResult.status === "fulfilled") setVelocityData(velocityResult.value);
      else { console.error(velocityResult.reason); setVelocityData([]); }

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
        {
          title: "Risk Exposure",
          value: exposureScore,
          change: "--",
          trend: "stable",
          icon: Gauge,
          color: "text-chart-5",
          bgColor: "bg-chart-5/10",
          description: "skor eksposur tertimbang",
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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
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
        <RiskHeatmap data={heatmapData} loading={loading} velocityData={velocityData} />

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
        <TopRisksPanel risks={topRisks} loading={loading} />
        <RiskMovementSnapshot data={movementSnapshot} loading={loading} />
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-semibold">Distribusi Kategori Risiko</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Jumlah risiko per kategori dalam portofolio saat ini.</p>
          </div>
        </CardHeader>
        <CardContent>
          {isRiskCategoryLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Memuat data kategori...
            </div>
          ) : riskCategoryError ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Data kategori risiko tidak tersedia saat ini.
            </div>
          ) : riskCategoryData.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Belum ada data kategori risiko.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={riskCategoryData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    formatter={(value) => [`${value} risiko`]}
                    contentStyle={{ background: "oklch(0.15 0.02 265 / 95%)", border: "1px solid oklch(0.3 0.03 265)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.9 0 0)", backdropFilter: "blur(8px)" }}
                  />
                  <Bar dataKey="count" fill="oklch(0.55 0.18 265)" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" style={{ fill: "oklch(0.7 0 0)", fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-3">
          <CardHeader>
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
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
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
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data semester untuk menghitung eksposur high dan extreme.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="text-base font-semibold">Incident vs Mitigation Closure</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Perbandingan insiden baru, mitigasi selesai, dan overdue per bulan.</p>
            </div>
          </CardHeader>
          <CardContent>
            {actionPressureData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={actionPressureData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Data incident dan closure mitigasi belum tersedia untuk periode ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Lanjutkan ke Halaman Detail</p>
            <p className="text-xs text-muted-foreground">Pindah ke monitoring lanjutan atau ekspor laporan jika perlu analisis lebih dalam.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/compliance/monitoring">
                <ClipboardCheck className="size-4" />
                Buka Monitoring &amp; Updates
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/reports">
                <FileBarChart className="size-4" />
                Buka Reports &amp; Export
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
