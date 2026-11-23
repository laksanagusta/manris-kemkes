"use client";

import { useEffect, useState } from "react";

import { MitigationProgressTab } from "@/components/shared/mitigation-progress-tab";
import { MonitoringEvidence, type MonitoringEvidenceResult } from "@/components/shared/design-system/domain/monitoring-evidence";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export function FinalMonitoringEvidence({ monitoringId }: { monitoringId: string }) {
  const { token } = useAuth();
  const [result, setResult] = useState<MonitoringEvidenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.get<MonitoringEvidenceResult>(`/risk-monitorings/${encodeURIComponent(monitoringId)}/evidence`, token)
      .then((data) => { if (active) setResult(data); })
      .catch(() => { if (active) setError("Bukti saat finalisasi belum dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [monitoringId, token, attempt]);

  return <MonitoringEvidence result={result} loading={loading} error={error} onRefresh={() => {
    setLoading(true);
    setError("");
    setAttempt((value) => value + 1);
  }} />;
}

export function MitigationStatusTable({ monitoringId }: { monitoringId: string }) {
  const { token } = useAuth();
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);
  return (
    <MitigationProgressTab key={`${monitoringId}:${refresh}`} riskId="" monitoringId={monitoringId} token={token || ""} showTaskList allowInMonitoring />
  );
}
