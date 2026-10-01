"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RiskCountTrendChart } from "./_components/risk-count-trend-chart";
import { RiskCategoryPieChart } from "./_components/risk-category-pie-chart";
import { RiskCompositionTrendChart } from "./_components/risk-composition-trend-chart";
import { CurrentRiskHeatmap } from "./_components/current-risk-heatmap";
import {
  DashboardKpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import type {
  DashboardRiskCategoryItem,
  Risk,
} from "@/types/risk";
import { api } from "@/lib/api";
import {
  buildCurrentRiskHeatmapMatrix,
  buildDashboardRiskCategoryData,
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
  const [riskCategoryData, setRiskCategoryData] = useState<
    ReturnType<typeof buildDashboardRiskCategoryData>
  >([]);
  const [riskCategoryLoading, setRiskCategoryLoading] = useState(true);
  const [riskCategoryError, setRiskCategoryError] = useState(false);
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
        if (!cancelled) setRiskCategoryData(buildDashboardRiskCategoryData(result));
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setRiskCategoryError(true);
      })
      .finally(() => {
        if (!cancelled) setRiskCategoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, currentCycle, trendCycles, reloadKey]);

  const totalRisks = summary?.totalRisks;
  const highExtreme = summary?.highExtreme;
  const overdueMitigations = summary?.overdueMitigations;
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
    setRiskCategoryData([]);
    setRiskCategoryLoading(true);
    setRiskCategoryError(false);
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
      title: "Mitigasi overdue",
      value:
        overdueMitigations === undefined ? "—" : String(overdueMitigations),
      detail: "tugas melewati tenggat",
      trend: "up",
      loading: summaryLoading,
      error: summaryError,
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

      <section
        data-dashboard-section="trend"
        aria-label="Tren dan distribusi risiko"
        className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]"
      >
        <div className="flex min-h-0 min-w-0 w-full xl:h-[32rem] [&>*]:h-full [&>*]:w-full">
          <RiskCountTrendChart
            risks={trendRisks}
            currentCycle={currentCycle}
            loading={trendLoading}
            error={trendError}
            onRetry={retryDashboard}
          />
        </div>
        <div className="flex min-h-0 min-w-0 w-full xl:h-[32rem] [&>*]:h-full [&>*]:w-full">
          <RiskCategoryPieChart
            data={riskCategoryData}
            loading={riskCategoryLoading}
            error={riskCategoryError}
            onRetry={retryDashboard}
          />
        </div>
      </section>

      <section
        data-dashboard-section="composition"
        aria-label="Komposisi risiko dan peta risiko saat ini"
        className="grid items-start gap-4 pb-4 xl:items-stretch xl:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]"
      >
        <div className="flex min-h-0 min-w-0 w-full xl:h-[32rem] [&>*]:h-full [&>*]:w-full">
          <RiskCompositionTrendChart
            risks={trendRisks}
            currentCycle={currentCycle}
            loading={trendLoading}
            error={trendError}
            onRetry={retryDashboard}
          />
        </div>
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
