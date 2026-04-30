"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Clock,
  FileBarChart,
  Flame,
  Gauge,
  Minus,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { MultiPhaseHeatmapCompareCard } from "../compliance/_components/multi-phase-heatmap-compare";
import { UnitTotalRiskScoreChart } from "./_components/unit-total-risk-score-chart";
import type {
  Risk,
} from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildUnitTotalRiskScoreData,
  levelFromScore,
  weightFor,
} from "@/lib/dashboard-insights";
import { resolveRiskScoreSemantics } from "@/lib/risk";
import { cn } from "@/lib/utils";

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

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function resolveRiskCycleKey(risk: Pick<Risk, "assessmentCycle">) {
  if (risk.assessmentCycle?.trim()) return risk.assessmentCycle.trim();
  return null;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<DashboardSummary | null>(null);
  const [trendRisks, setTrendRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [exposureScore, setExposureScore] = useState(0);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => {
    const [yearStr, half] = currentCycle.split("-");
    const year = Number(yearStr);
    if (half === "H1") return `${year - 1}-H2`;
    return `${year}-H1`;
  }, [currentCycle]);
  const unitTotalRiskScoreData = useMemo(() => {
    const currentCycleRisks = trendRisks.filter(
      (risk) => resolveRiskCycleKey(risk) === currentCycle,
    );
    return buildUnitTotalRiskScoreData(currentCycleRisks);
  }, [trendRisks, currentCycle]);

  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      api.get<DashboardSummary>(
        `/dashboard/summary?cycle=${currentCycle}`,
        token,
      ),
      api.get<DashboardSummary>(
        `/dashboard/summary?cycle=${previousCycle}`,
        token,
      ),
      api.get<Risk[]>("/risks/trend", token),
    ]).then(
      ([
        summaryResult,
        prevSummaryResult,
        risksResult,
      ]) => {
        if (summaryResult.status === "fulfilled")
          setSummary(summaryResult.value);
        else console.error(summaryResult.reason);

        if (prevSummaryResult.status === "fulfilled")
          setPrevSummary(prevSummaryResult.value);
        else console.error(prevSummaryResult.reason);

        if (risksResult.status === "fulfilled") {
          const risks = risksResult.value;
          setTrendRisks(risks);
          const score = risks.reduce((sum, r) => {
            const lvl = levelFromScore(
              resolveRiskScoreSemantics(r).effective.score,
            );
            return sum + weightFor(lvl);
          }, 0);
          setExposureScore(score);
        } else {
          console.error(risksResult.reason);
          setTrendRisks([]);
        }

        setLoading(false);
      },
    );
  }, [token, currentCycle, previousCycle]);

  const calculateTrend = (
    current: number,
    prev: number | undefined,
  ): Pick<KpiCard, "trend" | "change"> => {
    if (prev === undefined || prev === 0)
      return { trend: "stable", change: "--" };
    const percent = Math.round(((current - prev) / prev) * 100);
    const sign = percent > 0 ? "+" : percent < 0 ? "-" : "";
    const absPercent = Math.abs(percent);
    let trend: "up" | "down" | "stable" = "stable";
    if (percent > 0) trend = "up";
    else if (percent < 0) trend = "down";

    return { trend, change: percent === 0 ? "0%" : `${sign}${absPercent}%` };
  };

  const kpiCards: KpiCard[] = summary
    ? [
        {
          title: "Total Risiko",
          value: summary.totalRisks,
          ...calculateTrend(summary.totalRisks, prevSummary?.totalRisks),
          icon: ShieldAlert,
          color: "text-chart-1",
          bgColor: "bg-chart-1/10",
          description: "risiko terdaftar",
        },
        {
          title: "Risiko Tinggi & Sangat Tinggi",
          value: summary.highExtreme,
          ...calculateTrend(summary.highExtreme, prevSummary?.highExtreme),
          icon: Flame,
          color: "text-risk-extreme",
          bgColor: "bg-risk-extreme/10",
          description: "memerlukan perhatian",
        },
        {
          title: "Penanganan Overdue",
          value: summary.overdueMitigations,
          ...calculateTrend(
            summary.overdueMitigations,
            prevSummary?.overdueMitigations,
          ),
          icon: Clock,
          color: "text-warning",
          bgColor: "bg-warning/10",
          description: "melewati tenggat",
        },
        {
          title: "Insiden Bulan Ini",
          value: summary.incidentsThisMonth,
          ...calculateTrend(
            summary.incidentsThisMonth,
            prevSummary?.incidentsThisMonth,
          ),
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
    return (
      <div className="animate-pulse p-8 text-center text-muted-foreground">
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Gambaran keseluruhan kondisi risiko organisasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-muted-foreground">
            Terakhir diperbarui: 10 Mar 2026, 23:45
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.title}
            className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
          >
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
                        kpi.trend === "down"
                          ? "text-success"
                          : kpi.trend === "up"
                            ? "text-risk-high"
                            : "text-muted-foreground",
                      )}
                    >
                      {kpi.trend === "up" && <TrendingUp className="size-3" />}
                      {kpi.trend === "down" && (
                        <TrendingDown className="size-3" />
                      )}
                      {kpi.trend === "stable" && kpi.change !== "--" && (
                        <Minus className="size-3" />
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

      <div className="mt-5">
        <MultiPhaseHeatmapCompareCard />
      </div>

      <div className="mt-5">
        <UnitTotalRiskScoreChart
          data={unitTotalRiskScoreData}
          cycle={currentCycle}
          loading={loading}
        />
      </div>

      <Card className="mt-12 border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Lanjutkan ke Halaman Detail
            </p>
            <p className="text-xs text-muted-foreground">
              Pindah ke monitoring lanjutan atau ekspor laporan jika perlu
              analisis lebih dalam.
            </p>
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
