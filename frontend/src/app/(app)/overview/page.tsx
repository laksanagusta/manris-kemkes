"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RiskCountTrendChart } from "./_components/risk-count-trend-chart";
import { TopRisksPanel } from "./_components/top-risks-panel";
import { CurrentRiskHeatmap } from "./_components/current-risk-heatmap";
import {
  DashboardKpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import type {
  Risk,
  TopRiskItem,
} from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildCurrentRiskHeatmapMatrix,
  calculateRiskExposureScore,
} from "@/lib/dashboard-insights";
import { currentAssessmentCycle, shiftAssessmentCycle } from "@/lib/risk-cycle-options";

type DashboardSummary = {
  totalRisks: number;
  highExtreme: number;
  overdueMitigations: number;
  unreportedMitigations: number;
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
  const unreportedMitigations = summary?.unreportedMitigations;
  const currentHeatmapMatrix = useMemo(
    () => buildCurrentRiskHeatmapMatrix(trendRisks, currentCycle),
    [trendRisks, currentCycle],
  );
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
      title: "Total",
      value: totalRisks === undefined ? "—" : String(totalRisks),
      detail: "risiko terdaftar",
      trend: "up",
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Prioritas",
      value: highExtreme === undefined ? "—" : String(highExtreme),
      detail: "risiko tinggi & ekstrem",
      trend: "up",
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Mitigasi belum terlapor",
      value:
        unreportedMitigations === undefined
          ? "—"
          : String(unreportedMitigations),
      detail: "tugas tanpa laporan",
      trend: "down",
      loading: summaryLoading,
      error: summaryError,
    },
    {
      title: "Eksposur",
      value: exposureScore === null ? "—" : String(exposureScore),
      detail: "skor paparan risiko",
      trend: "down",
      loading: trendLoading,
      error: trendError,
    },
  ] as const;

  return (
    <PageStack className="space-y-5 lg:space-y-6">
      <section
        data-dashboard-section="kpis"
        aria-label="Ringkasan metrik risiko"
      >
        <MetricGrid className="gap-3">
          {kpiCards.map((kpi) => (
            <DashboardKpiCard key={kpi.title} {...kpi} />
          ))}
        </MetricGrid>
      </section>

      <section data-dashboard-section="trend" aria-label="Tren risiko">
        <RiskCountTrendChart
          risks={trendRisks}
          currentCycle={currentCycle}
          loading={trendLoading}
          error={trendError}
          onRetry={retryDashboard}
        />
      </section>

      <section
        data-dashboard-section="priorities"
        aria-label="Prioritas dan distribusi risiko"
        className="grid items-start gap-4 pb-4 xl:items-stretch xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
      >
        <TopRisksPanel
          risks={topRisks}
          loading={topRisksLoading}
          error={topRisksError}
          onRetry={retryDashboard}
        />
        <CurrentRiskHeatmap
          matrix={currentHeatmapMatrix}
          loading={trendLoading}
          error={trendError}
          onRetry={retryDashboard}
        />
      </section>
    </PageStack>
  );
}
