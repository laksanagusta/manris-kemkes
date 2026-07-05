"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { MultiPhaseHeatmapCompareCard } from "../compliance/_components/multi-phase-heatmap-compare";
import { RiskCategoryPieChart } from "./_components/risk-category-pie-chart";
import { UnitTotalRiskScoreChart } from "./_components/unit-total-risk-score-chart";
import { TopRisksPanel } from "./_components/top-risks-panel";
import type { Risk, DashboardRiskCategoryItem, TopRiskItem } from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildDashboardRiskCategoryData,
  buildUnitTotalRiskScoreData,
  levelFromScore,
  selectEffectiveRiskVersions,
  weightFor,
} from "@/lib/dashboard-insights";
import { resolveRiskScoreSemantics } from "@/lib/risk";
import { cn } from "@/lib/utils";

type DashboardSummary = {
  totalRisks: number;
  highExtreme: number;
  overdueMitigations: number;
};

type KpiCard = {
  title: string;
  value: number;
  change: string;
  trend: "up" | "down" | "stable";
  description: string;
};

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<DashboardSummary | null>(null);
  const [trendRisks, setTrendRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [exposureScore, setExposureScore] = useState(0);
  const [riskCategoryData, setRiskCategoryData] = useState<
    ReturnType<typeof buildDashboardRiskCategoryData>
  >([]);
  const [riskCategoryLoading, setRiskCategoryLoading] = useState(true);
  const [riskCategoryError, setRiskCategoryError] = useState(false);
  const [topRisks, setTopRisks] = useState<TopRiskItem[]>([]);
  const [topRisksLoading, setTopRisksLoading] = useState(true);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => {
    const [yearStr, half] = currentCycle.split("-");
    const year = Number(yearStr);
    if (half === "H1") return `${year - 1}-H2`;
    return `${year}-H1`;
  }, [currentCycle]);
  const unitTotalRiskScoreData = useMemo(() => {
    const currentCycleRisks = selectEffectiveRiskVersions(
      trendRisks,
      currentCycle,
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
      api.get<DashboardRiskCategoryItem[]>(
        `/dashboard/risk-categories?cycle=${currentCycle}`,
        token,
      ),
      api.get<TopRiskItem[]>(
        `/dashboard/top-risks?cycle=${currentCycle}`,
        token,
      ),
    ]).then(([summaryResult, prevSummaryResult, risksResult, categoryResult, topRisksResult]) => {
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
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

      if (categoryResult.status === "fulfilled") {
        setRiskCategoryData(
          buildDashboardRiskCategoryData(categoryResult.value),
        );
        setRiskCategoryError(false);
      } else {
        console.error(categoryResult.reason);
        setRiskCategoryData([]);
        setRiskCategoryError(true);
      }
      setRiskCategoryLoading(false);

      if (topRisksResult.status === "fulfilled") {
        setTopRisks(topRisksResult.value);
      } else {
        console.error(topRisksResult.reason);
        setTopRisks([]);
      }
      setTopRisksLoading(false);

      setLoading(false);
    });
  }, [token, currentCycle, previousCycle]);

  const calculateTrend = (
    current: number,
    prev: number | undefined,
  ): Pick<KpiCard, "trend" | "change"> => {
    if (prev === undefined || prev === 0)
      return { trend: "stable", change: "0%" };
    const percent = Math.round(((current - prev) / prev) * 100);
    const absPercent = Math.abs(percent);
    let trend: "up" | "down" | "stable" = "stable";
    if (percent > 0) trend = "up";
    else if (percent < 0) trend = "down";

    return { trend, change: percent === 0 ? "0%" : `${absPercent}%` };
  };

  const totalRisks = summary?.totalRisks ?? 0;
  const highExtreme = summary?.highExtreme ?? 0;
  const overdueMitigations = summary?.overdueMitigations ?? 0;
  const kpiCards: KpiCard[] = [
    {
      title: "Total Risiko",
      value: totalRisks,
      ...calculateTrend(totalRisks, prevSummary?.totalRisks),
      description: "risiko terdaftar",
    },
    {
      title: "Risiko Tinggi & Sangat Tinggi",
      value: highExtreme,
      ...calculateTrend(highExtreme, prevSummary?.highExtreme),
      description: "memerlukan perhatian",
    },
    {
      title: "Penanganan Overdue",
      value: overdueMitigations,
      ...calculateTrend(
        overdueMitigations,
        prevSummary?.overdueMitigations,
      ),
      description: "melewati tenggat",
    },
    {
      title: "Risk Exposure",
      value: exposureScore,
      change: "0%",
      trend: "stable",
      description: "skor eksposur tertimbang",
    },
  ];

  if (loading) {
    return (
      <div className="animate-pulse p-8 text-center text-muted-foreground">
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.title}
            className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border bg-card p-4"
          >
            <p className="text-sm font-medium capitalize tracking-normal text-muted-foreground">
              {kpi.title}
            </p>
            <div className="mt-auto flex items-end gap-2 pt-3">
              <span className="text-2xl font-medium tracking-tight text-foreground tabular-nums">
                {kpi.value}
              </span>
              {kpi.change !== "--" && (
                <div
                  title="Dibandingkan dengan siklus sebelumnya"
                  className={cn(
                    "mb-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
                    kpi.trend === "up" && "bg-success/10 text-success",
                    kpi.trend === "down" && "bg-destructive/10 text-destructive",
                    kpi.trend === "stable" && "bg-muted text-muted-foreground",
                  )}
                >
                  {kpi.trend === "up" && <ArrowUp className="size-3" />}
                  {kpi.trend === "down" && <ArrowDown className="size-3" />}
                  {kpi.trend === "stable" && <Minus className="size-3" />}
                  {kpi.change}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <MultiPhaseHeatmapCompareCard />
        <RiskCategoryPieChart
          data={riskCategoryData}
          loading={riskCategoryLoading}
          error={riskCategoryError}
          cycle={currentCycle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UnitTotalRiskScoreChart
          data={unitTotalRiskScoreData}
          cycle={currentCycle}
          loading={loading}
        />
        <TopRisksPanel risks={topRisks} loading={topRisksLoading} className="lg:col-span-1" />
      </div>
    </div>
  );
}
