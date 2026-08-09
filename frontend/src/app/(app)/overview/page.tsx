"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { MultiPhaseHeatmapCompareCard } from "../compliance/_components/multi-phase-heatmap-compare";
import { RiskCategoryPieChart } from "./_components/risk-category-pie-chart";
import { UnitTotalRiskScoreChart } from "./_components/unit-total-risk-score-chart";
import { TopRisksPanel } from "./_components/top-risks-panel";
import { DashboardKpiCard } from "@/components/shared/design-system";
import { MetricGrid, PageStack } from "@/components/shared/design-system";
import type { Risk, DashboardRiskCategoryItem, TopRiskItem } from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildDashboardRiskCategoryData,
  calculateDashboardTrend,
  calculateRiskExposureScore,
} from "@/lib/dashboard-insights";

type DashboardSummary = {
  totalRisks: number;
  highExtreme: number;
  overdueMitigations: number;
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
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(false);
  const [exposureScore, setExposureScore] = useState<number | null>(null);
  const [previousExposureScore, setPreviousExposureScore] = useState<number | null>(null);
  const [riskCategoryData, setRiskCategoryData] = useState<
    ReturnType<typeof buildDashboardRiskCategoryData>
  >([]);
  const [riskCategoryLoading, setRiskCategoryLoading] = useState(true);
  const [riskCategoryError, setRiskCategoryError] = useState(false);
  const [topRisks, setTopRisks] = useState<TopRiskItem[]>([]);
  const [topRisksLoading, setTopRisksLoading] = useState(true);
  const [topRisksError, setTopRisksError] = useState(false);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const previousCycle = useMemo(() => {
    const [yearStr, half] = currentCycle.split("-");
    const year = Number(yearStr);
    if (half === "H1") return `${year - 1}-H2`;
    return `${year}-H1`;
  }, [currentCycle]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void api
      .get<DashboardSummary>(`/dashboard/summary?cycle=${currentCycle}`, token)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setSummaryError(true);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    void api
      .get<DashboardSummary>(`/dashboard/summary?cycle=${previousCycle}`, token)
      .then((result) => {
        if (!cancelled) setPrevSummary(result);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setPrevSummary(null);
      });

    void api
      .get<Risk[]>("/risks/trend", token)
      .then((risks) => {
        if (cancelled) return;
        setTrendRisks(risks);
        setExposureScore(calculateRiskExposureScore(risks, currentCycle));
        setPreviousExposureScore(
          calculateRiskExposureScore(risks, previousCycle),
        );
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setTrendError(true);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });

    void api
      .get<DashboardRiskCategoryItem[]>(
        `/dashboard/risk-categories?cycle=${currentCycle}`,
        token,
      )
      .then((result) => {
        if (!cancelled) {
          setRiskCategoryData(buildDashboardRiskCategoryData(result));
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setRiskCategoryError(true);
      })
      .finally(() => {
        if (!cancelled) setRiskCategoryLoading(false);
      });

    void api
      .get<TopRiskItem[]>(`/dashboard/top-risks?cycle=${currentCycle}`, token)
      .then((result) => {
        if (!cancelled) setTopRisks(result);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setTopRisksError(true);
      })
      .finally(() => {
        if (!cancelled) setTopRisksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, currentCycle, previousCycle]);

  const totalRisks = summary?.totalRisks;
  const highExtreme = summary?.highExtreme;
  const overdueMitigations = summary?.overdueMitigations;
  const kpiCards = [
    {
      title: "Total Risiko",
      value: totalRisks === undefined ? "—" : String(totalRisks),
      ...calculateDashboardTrend(totalRisks, prevSummary?.totalRisks),
      tone: "warning" as const,
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Risiko Tinggi & Sangat Tinggi",
      value: highExtreme === undefined ? "—" : String(highExtreme),
      ...calculateDashboardTrend(highExtreme, prevSummary?.highExtreme),
      tone: "warning" as const,
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Penanganan Overdue",
      value:
        overdueMitigations === undefined ? "—" : String(overdueMitigations),
      ...calculateDashboardTrend(
        overdueMitigations,
        prevSummary?.overdueMitigations,
      ),
      tone: "warning" as const,
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Risk Exposure",
      value: exposureScore === null ? "—" : String(exposureScore),
      ...calculateDashboardTrend(
        exposureScore ?? undefined,
        previousExposureScore ?? undefined,
      ),
      tone: "neutral" as const,
      loading: trendLoading,
      error: trendError,
    },
  ];

  return (
    <PageStack>
      <MetricGrid>
        {kpiCards.map((kpi) => (
          <DashboardKpiCard key={kpi.title} {...kpi} />
        ))}
      </MetricGrid>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
        <MultiPhaseHeatmapCompareCard />
        <RiskCategoryPieChart
          data={riskCategoryData}
          loading={riskCategoryLoading}
          error={riskCategoryError}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UnitTotalRiskScoreChart
          risks={trendRisks}
          currentCycle={currentCycle}
          loading={trendLoading}
          error={trendError}
        />
        <TopRisksPanel
          risks={topRisks}
          loading={topRisksLoading}
          error={topRisksError}
          className="lg:col-span-1"
        />
      </div>
    </PageStack>
  );
}
