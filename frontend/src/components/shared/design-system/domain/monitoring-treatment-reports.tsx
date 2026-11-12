"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClassName } from "@/lib/badge-variant";
import { getMitigationReportLabel, hasReportedMitigation } from "@/lib/mitigation-report-status";
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import type { MitigationTask } from "@/types/risk";

import { ActionButton } from "../actions/action-button";
import { MitigationProgressFlowDialog } from "./mitigation-progress-flow-dialog";
import { MitigationReportDetail, type MitigationReportDetailTask } from "./mitigation-report-detail";

type TreatmentTask = Pick<MitigationTask,
  "id" | "mitigationAction" | "status" | "periodEnd" | "dueDate" | "reportedAt" | "notes"
>;
function TreatmentReportBadge({ task }: { task: Pick<TreatmentTask, "status" | "reportedAt" | "notes"> }) {
  return (
    <Badge variant="secondary" className={hasReportedMitigation(task) ? getStatusBadgeClassName("success") : undefined}>
      {getMitigationReportLabel(task)}
    </Badge>
  );
}

function TreatmentReportDialog({
  task,
  loadReport,
}: {
  task: TreatmentTask;
  loadReport: (id: string) => Promise<MitigationReportDetailTask>;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<MitigationReportDetailTask | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const taskName = task.mitigationAction || "Tindakan penanganan";

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadReport(task.id).then((report) => {
      if (active) setResult(report);
    }).catch(() => {
      if (active) setResult("error");
    });
    return () => { active = false; };
  }, [open, task.id, loadReport, attempt]);

  return (
    <MitigationProgressFlowDialog
      readOnly
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setResult(null);
        setOpen(nextOpen);
      }}
      trigger={
        <ActionButton type="button" size="sm" aria-label={`Lihat laporan: ${taskName}`}>
          Lihat laporan
        </ActionButton>
      }
      detailTitle="Detail Laporan Penanganan"
      detailDescription="Tinjau status, bukti, dan catatan penanganan."
      detailContent={
        result === "error" ? (
          <p role="alert" className="text-muted-foreground">Laporan belum dapat dimuat. Periksa akses dan coba lagi.</p>
        ) : result ? (
          <MitigationReportDetail task={result} />
        ) : (
          <p role="status" className="text-muted-foreground">Memuat laporan penanganan…</p>
        )
      }
      detailAction={result === "error" && (
        <ActionButton type="button" onClick={() => {
          setResult(null);
          setAttempt((current) => current + 1);
        }}>Coba lagi</ActionButton>
      )}
    />
  );
}

export function MonitoringTreatmentReports({
  tasks,
  loadReport,
}: {
  tasks: TreatmentTask[];
  loadReport: (id: string) => Promise<MitigationReportDetailTask>;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const reportedCount = tasks.filter(hasReportedMitigation).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm" role="status">{reportedCount} dari {tasks.length} tindakan sudah dilaporkan</p>
        <ActionButton type="button" size="sm" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Sembunyikan laporan" : "Lihat laporan"}
        </ActionButton>
      </div>
      <ul id={listId} hidden={!expanded} className="divide-y divide-border">
        {tasks.map((task) => {
          const action = getMitigationTaskReportAction(task);
          const taskName = task.mitigationAction || "Tindakan penanganan";
          return (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0 space-y-1">
                <p className="wrap-break-word text-sm font-medium">{taskName}</p>
                <TreatmentReportBadge task={{ ...task, status: action.isOverdue ? "overdue" : task.status }} />
              </div>
              {task.status === "done" ? (
                <TreatmentReportDialog task={task} loadReport={loadReport} />
              ) : (
                <ActionButton asChild size="sm">
                  <Link href={`/compliance/penanganan?taskId=${encodeURIComponent(task.id)}`} target="_blank" rel="noopener" aria-label={`${action.label}: ${taskName} (tab baru)`}>
                    {action.label}
                  </Link>
                </ActionButton>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
