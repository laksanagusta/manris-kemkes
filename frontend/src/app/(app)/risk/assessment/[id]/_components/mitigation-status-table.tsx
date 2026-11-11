"use client";

import { useCallback, useEffect, useState } from "react";

import { ActionButton, IllustratedEmptyState } from "@/components/shared/design-system";
import { MonitoringTreatmentReports } from "@/components/shared/design-system/domain/monitoring-treatment-reports";
import { useAuth } from "@/contexts/auth-context";
import { getMitigationTask, listMonitoringTasks } from "@/lib/api/mitigation-tasks";
import type { MitigationTask } from "@/types/risk";

export function MitigationStatusTable({ monitoringId }: { monitoringId: string }) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MitigationTask[] | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  const loadReport = useCallback((taskId: string) => {
    if (!token) return Promise.reject(new Error("Sesi tidak tersedia"));
    return getMitigationTask(token, taskId);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    listMonitoringTasks(token, monitoringId).then((data) => {
      if (active) {
        setTasks(data);
        setError(false);
      }
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [token, monitoringId, refresh]);

  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  if (error && !tasks?.length) return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
      <p>Laporan penanganan belum dapat dimuat.</p>
      <ActionButton type="button" size="sm" onClick={reload}>Coba lagi</ActionButton>
    </div>
  );
  if (!tasks) return <p role="status" className="text-sm text-muted-foreground">Memuat laporan penanganan…</p>;
  if (!tasks.length) return (
    <IllustratedEmptyState title="Tidak ada tugas penanganan pada periode ini" size="compact" />
  );

  return (
    <>
      <MonitoringTreatmentReports tasks={tasks} loadReport={loadReport} />
      {error && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <p>Laporan penanganan belum dapat diperbarui.</p>
          <ActionButton type="button" size="sm" onClick={reload}>Coba lagi</ActionButton>
        </div>
      )}
    </>
  );
}
