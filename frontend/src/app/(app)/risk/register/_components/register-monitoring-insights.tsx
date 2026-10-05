"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  currentMonitoringCycle,
  shiftMonitoringCycle,
} from "@/lib/risk-cycle-options";
import { getRiskLevelFromNilai } from "@/lib/risk";
import type { Risk } from "@/types/risk";
import { MonitoringInsightCard } from "@/components/shared/design-system/domain/monitoring-insight-card";

type SnapshotRisk = Risk & { archivedAt?: string | null };
const levels = ["sangat_rendah", "rendah", "sedang", "tinggi", "sangat_tinggi"];

function isArchivedByCycleEnd(archivedAt: string | null | undefined, cycle: string) {
  if (!archivedAt) return false;

  const match = /^(\d{4})-Q([1-4])$/.exec(cycle);
  const archivedDate = new Date(archivedAt);
  if (!match || Number.isNaN(archivedDate.getTime())) return true;

  const nextCycleStart = new Date(Number(match[1]), Number(match[2]) * 3, 1);
  return archivedDate.getTime() < nextCycleStart.getTime();
}

export function RegisterMonitoringInsights({ refreshKey }: { refreshKey: unknown }) {
  const { token } = useAuth();
  const [cycle] = useState(() =>
    shiftMonitoringCycle(currentMonitoringCycle(), -1),
  );
  const [risks, setRisks] = useState<SnapshotRisk[]>([]);
  const [overdue, setOverdue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void Promise.allSettled([
      api.get<SnapshotRisk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(cycle)}`, token),
      api.get<{ overdueMitigations: number }>(`/dashboard/summary?cycle=${encodeURIComponent(cycle)}`, token),
    ]).then(([snapshot, summary]) => {
      if (cancelled) return;
      setError(snapshot.status === "rejected");
      setRisks(snapshot.status === "fulfilled" ? snapshot.value : []);
      setOverdue(summary.status === "fulfilled" ? summary.value.overdueMitigations : null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, cycle, retry, refreshKey]);

  const insight = useMemo(() => {
    const unique = new Map<string, SnapshotRisk>();
    for (const risk of risks) {
      if (!isArchivedByCycleEnd(risk.archivedAt, cycle) && risk.status === "final") {
        unique.set(risk.versionGroupId || risk.id, risk);
      }
    }
    const active = [...unique.values()];
    // The cycle-snapshot endpoint attaches only finalized observations.
    const isMonitored = (risk: SnapshotRisk) => risk.monitoringAssessmentCycle === cycle && risk.monitoringObservedNilai != null;
    const rank = (score: number) => levels.indexOf(getRiskLevelFromNilai(score));
    const score = (risk: SnapshotRisk) => risk.nilai ?? risk.inherentScore;
    const pending = active.filter((risk) => !isMonitored(risk));
    const increased = active.filter((risk) => isMonitored(risk) && rank(risk.monitoringObservedNilai!) > rank(score(risk)));
    return {
      total: active.length,
      finalized: active.length - pending.length,
      highPending: pending.filter((risk) => rank(score(risk)) >= 3).length,
      increased: increased.length,
    };
  }, [risks, cycle]);

  return <MonitoringInsightCard motion cycle={cycle} total={insight.total} finalized={insight.finalized} highPending={insight.highPending} increased={insight.increased} overdue={overdue} loading={loading} error={error} onRetry={() => { setLoading(true); setRetry((value) => value + 1); }} />;
}
