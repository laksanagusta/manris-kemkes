"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { RiskHeatmap } from "../../overview/_components/risk-heatmap";
import { TopRisksPanel } from "../../overview/_components/top-risks-panel";
import type { HeatmapVelocityCell, TopRiskItem } from "@/types/risk";

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

export function MonitoringHeatmapTopRisks() {
  const { token } = useAuth();
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [velocityData, setVelocityData] = useState<HeatmapVelocityCell[]>([]);
  const [topRisks, setTopRisks] = useState<TopRiskItem[]>([]);
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
    ]).then(([heatmapResult, velocityResult, topRisksResult]) => {
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

      setLoading(false);
    });
  }, [token, cycle, previousCycle]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <RiskHeatmap
        data={heatmapData}
        loading={loading}
        error={heatmapError}
        velocityData={velocityData}
      />
      <TopRisksPanel risks={topRisks} loading={loading} />
    </div>
  );
}
