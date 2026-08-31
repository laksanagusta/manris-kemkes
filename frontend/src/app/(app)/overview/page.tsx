"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { MultiPhaseHeatmapCompareCard } from "../compliance/_components/multi-phase-heatmap-compare";
import { UnitTotalRiskScoreChart } from "./_components/unit-total-risk-score-chart";
import { TopRisksPanel } from "./_components/top-risks-panel";
import {
  CollectionPageHeader,
  DashboardKpiCard,
} from "@/components/shared/design-system";
import { MetricGrid, PageStack } from "@/components/shared/design-system";
import type {
  Risk,
  TopRiskItem,
} from "@/types/risk";
import { api } from "@/lib/api";
import { calculateRiskExposureScore } from "@/lib/dashboard-insights";
import { currentAssessmentCycle, shiftAssessmentCycle } from "@/lib/risk-cycle-options";

type DashboardSummary = {
  totalRisks: number;
  highExtreme: number;
  overdueMitigations: number;
};

function currentGlobalCycle() {
  return currentAssessmentCycle();
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trendRisks, setTrendRisks] = useState<Risk[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(false);
  const [exposureScore, setExposureScore] = useState<number | null>(null);
  const [topRisks, setTopRisks] = useState<TopRiskItem[]>([]);
  const [topRisksLoading, setTopRisksLoading] = useState(true);
  const [topRisksError, setTopRisksError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const currentCycle = useMemo(() => currentGlobalCycle(), []);
  const trendCycles = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) =>
        shiftAssessmentCycle(currentCycle, index - 3),
      ),
    [currentCycle],
  );

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

    void Promise.all(
      trendCycles.map((trendCycle) =>
        api.get<Risk[]>(
          `/risks/cycle-snapshot?cycle=${encodeURIComponent(trendCycle)}`,
          token,
        ),
      ),
    )
      .then((snapshots) => {
        if (cancelled) return;
        const risks = snapshots.flatMap((snapshot, index) =>
          snapshot.map((risk) => ({
            ...risk,
            // The endpoint returns the profile's source cycle. The chart
            // bucket is the requested as-of cycle, which is also the period
            // represented by the attached finalized monitoring result.
            assessmentCycle: trendCycles[index],
          })),
        );
        setTrendRisks(risks);
        setExposureScore(calculateRiskExposureScore(risks, currentCycle));
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setTrendError(true);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
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
  }, [token, currentCycle, trendCycles, reloadKey]);

  const totalRisks = summary?.totalRisks;
  const highExtreme = summary?.highExtreme;
  const overdueMitigations = summary?.overdueMitigations;
  const retryDashboard = () => {
    setSummary(null);
    setSummaryLoading(true);
    setSummaryError(false);
    setTrendRisks([]);
    setTrendLoading(true);
    setTrendError(false);
    setExposureScore(null);
    setTopRisks([]);
    setTopRisksLoading(true);
    setTopRisksError(false);
    setReloadKey((value) => value + 1);
  };
  const kpiCards = [
    {
      title: "Total Risiko",
      value: totalRisks === undefined ? "—" : String(totalRisks),
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Risiko Tinggi & Sangat Tinggi",
      value: highExtreme === undefined ? "—" : String(highExtreme),
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Penanganan Overdue",
      value:
        overdueMitigations === undefined ? "—" : String(overdueMitigations),
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Risk Exposure",
      value: exposureScore === null ? "—" : String(exposureScore),
      loading: trendLoading,
      error: trendError,
    },
  ];

  return (
    <PageStack>
      <CollectionPageHeader title="Dashboard" />

      <MetricGrid>
        {kpiCards.map((kpi) => (
          <DashboardKpiCard key={kpi.title} {...kpi} />
        ))}
      </MetricGrid>

      <MultiPhaseHeatmapCompareCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <UnitTotalRiskScoreChart
          risks={trendRisks}
          currentCycle={currentCycle}
          loading={trendLoading}
          error={trendError}
          onRetry={retryDashboard}
        />
        <TopRisksPanel
          risks={topRisks}
          loading={topRisksLoading}
          error={topRisksError}
          onRetry={retryDashboard}
          className="lg:col-span-1"
        />
      </div>
    </PageStack>
  );
}
