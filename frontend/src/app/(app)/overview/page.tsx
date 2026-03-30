"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  BarChart3,
  Flame,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// Constants
const impactLabels = [
  "Insignificant",
  "Minor",
  "Moderate",
  "Major",
  "Catastrophic",
];
const likelihoodLabels = [
  "Rare",
  "Unlikely",
  "Possible",
  "Likely",
  "Almost Certain",
];

function getRiskLevel(prob: number, impact: number): string {
  const score = (prob + 1) * (impact + 1);
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 16) return "high";
  return "extreme";
}


const levelColors: Record<string, string> = {
  low: "heatmap-low",
  medium: "heatmap-medium",
  high: "heatmap-high",
  extreme: "heatmap-extreme",
};

const levelBadgeVariant: Record<string, string> = {
  low: "bg-risk-low/15 text-risk-low border-risk-low/20",
  medium: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  high: "bg-risk-high/15 text-risk-high border-risk-high/20",
  extreme: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const trendColors: Record<string, {color: string, label: string}> = {
  Rendah: { color: "oklch(0.72 0.17 155)", label: "Low" },
  Sedang: { color: "oklch(0.78 0.16 85)", label: "Medium" },
  Tinggi: { color: "oklch(0.70 0.18 40)", label: "High" },
  Ekstrem: { color: "oklch(0.62 0.22 27)", label: "Extreme" },
};

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [topRisks, setTopRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      api.get<any>("/dashboard/summary", token),
      api.get<number[][]>("/dashboard/heatmap", token),
      api.get<any[]>("/dashboard/top-risks", token),
      api.get<any[]>("/risks", token),
    ]).then(([sum, heat, top, allRisks]) => {
      setSummary(sum);
      setHeatmapData(heat);
      setTopRisks(top);
      
      // Calculate trend from real data
      const trends: Record<string, { Rendah: number; Sedang: number; Tinggi: number; Ekstrem: number }> = {};
      
      allRisks.forEach(risk => {
        if (!risk.createdAt) return;
        const d = new Date(risk.createdAt);
        const q = Math.ceil((d.getMonth() + 1) / 3);
        const period = `${d.getFullYear()}-Q${q}`;
        
        if (!trends[period]) {
          trends[period] = { Rendah: 0, Sedang: 0, Tinggi: 0, Ekstrem: 0 };
        }
        
        const score = risk.probability * risk.impact;
        let lvl = "Rendah";
        if (score >= 17) lvl = "Ekstrem";
        else if (score >= 10) lvl = "Tinggi";
        else if (score >= 5) lvl = "Sedang";
        
        trends[period][lvl as keyof typeof trends[string]] += 1;
      });
      
      const tl = Object.keys(trends).sort().map(k => ({ period: k, ...trends[k] }));
      setTrendData(tl);

      setLoading(false);
    }).catch(console.error);
  }, [token]);

  // Construct dynamic KPI cards
  const kpiCards = summary ? [
    {
      title: "Total Risiko",
      value: summary.totalRisks,
      change: "--",
      trend: "stable" as string,
      icon: ShieldAlert,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
      description: "risiko terdaftar",
    },
    {
      title: "Risiko Tinggi & Ekstrem",
      value: summary.highExtreme,
      change: "--",
      trend: "stable" as string,
      icon: Flame,
      color: "text-risk-extreme",
      bgColor: "bg-risk-extreme/10",
      description: "memerlukan perhatian",
    },
    {
      title: "Mitigasi Overdue",
      value: summary.overdueMitigations,
      change: "--",
      trend: "stable" as string,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      description: "melewati tenggat",
    },
    {
      title: "Insiden Bulan Ini",
      value: summary.incidentsThisMonth,
      change: "--",
      trend: "stable" as string,
      icon: AlertTriangle,
      color: "text-risk-high",
      bgColor: "bg-risk-high/10",
      description: "dilaporkan",
    },
  ] : [];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Gambaran keseluruhan kondisi risiko organisasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1.5">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-muted-foreground">
            Terakhir diperbarui: 10 Mar 2026, 23:45
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.title}
            className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            {/* Subtle gradient accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {kpi.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight">
                      {kpi.value}
                    </span>
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        kpi.trend === "down" ? "text-success" : kpi.trend === "up" ? "text-risk-high" : "text-muted-foreground"
                      )}
                    >
                      {kpi.trend === "up" && (
                        <TrendingUp className="size-3" />
                      )}
                      {kpi.trend === "down" && (
                        <TrendingDown className="size-3" />
                      )}
                      {kpi.change}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">
                    {kpi.description}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    kpi.bgColor
                  )}
                >
                  <kpi.icon className={cn("size-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Risk Heatmap 5x5 */}
        <Card className="lg:col-span-3 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Risk Heatmap 5×5
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Distribusi risiko berdasarkan Probabilitas × Dampak
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                Detail
                <ArrowUpRight className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              {/* Y-axis label */}
              <div className="flex flex-col items-center justify-center shrink-0 -mr-1">
                <span className="text-[9px] font-semibold text-muted-foreground tracking-widest [writing-mode:vertical-lr] rotate-180">
                  PROBABILITAS
                </span>
              </div>

              {/* Y-axis tick labels */}
              <div className="flex flex-col gap-[3px] justify-end pb-[22px] shrink-0">
                {[...likelihoodLabels].reverse().map((label) => (
                  <div key={label} className="h-0 flex-1 flex items-center justify-end pr-1.5">
                    <span className="text-[9px] text-muted-foreground leading-none text-right w-10 truncate">
                      {label.length > 8 ? label.slice(0, 7) + "…" : label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid + X-axis */}
              <div className="flex-1 min-w-0">
                {/* Heatmap grid */}
                <div className="grid grid-rows-5 gap-[3px]">
                  {[...heatmapData].reverse().map((row, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-5 gap-[3px]">
                      {row.map((count, colIdx) => {
                        const level = getRiskLevel(4 - rowIdx, colIdx);
                        return (
                          <div
                            key={colIdx}
                            className={cn(
                              "aspect-[4/3] flex items-center justify-center rounded-md text-xs font-bold transition-all hover:scale-[1.08] hover:shadow-md cursor-pointer",
                              levelColors[level]
                            )}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* X-axis labels */}
                <div className="grid grid-cols-5 gap-[3px] mt-1">
                  {impactLabels.map((label) => (
                    <div
                      key={label}
                      className="text-center text-[9px] text-muted-foreground truncate leading-tight"
                    >
                      {label.length > 8 ? label.slice(0, 7) + "…" : label}
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-center text-[9px] font-semibold text-muted-foreground tracking-widest">
                  DAMPAK →
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-3 border-t border-border/40 pt-3">
              {[
                { label: "Rendah", cls: "heatmap-low" },
                { label: "Sedang", cls: "heatmap-medium" },
                { label: "Tinggi", cls: "heatmap-high" },
                { label: "Ekstrem", cls: "heatmap-extreme" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={cn("size-2.5 rounded-[3px]", item.cls)} />
                  <span className="text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Risks */}
        <Card className="lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Top Risks
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                Lihat Semua
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRisks.map((risk) => (
                <div
                  key={risk.id}
                  className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold border",
                      levelBadgeVariant[getRiskLevel(risk.probability - 1, risk.impact - 1)]
                    )}
                  >
                    {risk.inherentScore}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {risk.code}
                      </span>
                      <Badge
                        className={cn(
                          "h-4 text-[9px] font-semibold border px-1.5",
                          levelBadgeVariant[getRiskLevel(risk.probability - 1, risk.impact - 1)]
                        )}
                      >
                        {getRiskLevel(risk.probability - 1, risk.impact - 1)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                      {risk.title}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {risk.orgName}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {risk.trend === "up" && (
                      <TrendingUp className="size-3.5 text-risk-high" />
                    )}
                    {risk.trend === "down" && (
                      <TrendingDown className="size-3.5 text-success" />
                    )}
                    {risk.trend === "stable" && (
                      <BarChart3 className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Trend Chart */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Risk Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Komposisi risiko per periode kuartal
              </p>
            </div>
            <div className="flex items-center gap-4">
              {Object.entries(trendColors).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-full"
                    style={{ background: val.color }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.5 0 0 / 8%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.02 265)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
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
                {Object.entries(trendColors).map(([key, val]) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="risk"
                    fill={val.color}
                    radius={
                      key === "Ekstrem" ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
