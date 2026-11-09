"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ActionButton, IllustratedEmptyState } from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { listMonitoringTasks } from "@/lib/api/mitigation-tasks";
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import { getMitigationReportLabel, hasReportedMitigation } from "@/lib/mitigation-report-status";
import type { MitigationTask } from "@/types/risk";

export function MitigationStatusTable({ monitoringId }: { monitoringId: string }) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MitigationTask[] | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);

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

  if (error) return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
      <p>Laporan penanganan belum dapat dimuat.</p>
      <ActionButton type="button" size="sm" onClick={reload}>Coba lagi</ActionButton>
    </div>
  );
  if (!tasks) return <p role="status" className="text-sm text-muted-foreground">Memuat laporan penanganan…</p>;
  if (!tasks.length) return (
    <IllustratedEmptyState title="Tidak ada tugas penanganan pada periode ini" size="compact" />
  );

  const reportedCount = tasks.filter(hasReportedMitigation).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm" role="status">{reportedCount} dari {tasks.length} tindakan sudah dilaporkan</p>
        <ActionButton type="button" size="sm" aria-expanded={expanded} aria-controls="monitoring-treatment-list" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Sembunyikan laporan" : "Lihat laporan"}
        </ActionButton>
      </div>
      <ul id="monitoring-treatment-list" hidden={!expanded} className="divide-y divide-border">
        {tasks.map((task) => {
          const action = getMitigationTaskReportAction(task);
          return (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0 space-y-1">
                <p className="wrap-break-word text-sm font-medium">{task.mitigationAction || "Tindakan penanganan"}</p>
                <Badge variant="secondary">{getMitigationReportLabel({ ...task, status: action.isOverdue ? "overdue" : task.status })}</Badge>
              </div>
              <ActionButton asChild size="sm">
                <Link href={`/compliance/penanganan?taskId=${encodeURIComponent(task.id)}`} target="_blank" rel="noopener" aria-label={`${action.label}: ${task.mitigationAction || "tindakan penanganan"} (tab baru)`}>
                  {action.label}
                </Link>
              </ActionButton>
            </li>
          );
        })}
      </ul>
      {expanded && <p className="text-xs text-muted-foreground">Tautan dibuka di tab baru agar isian pemantauan tetap tersedia.</p>}
    </div>
  );
}
