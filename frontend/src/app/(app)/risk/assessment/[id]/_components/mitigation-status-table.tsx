"use client";

import { useEffect, useState, useCallback } from "react";
import { useMemo, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import {
  listMonitoringTasks,
  updateTaskReport,
} from "@/lib/api/mitigation-tasks";
import type { MitigationTask } from "@/types/risk";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  Send,
} from "@/components/ui/icons";
import {
  AccentButton,
  ActionButton,
  MitigationProgressDialog,
} from "@/components/shared/design-system";
import {
  normalizeMitigationReportPayload,
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import { toast } from "sonner";

interface MitigationStatusTableProps {
  monitoringId: string;
}

function hasCompletedReport(task: MitigationTask) {
  return (
    task.status === "done" &&
    Boolean(task.reportedAt) &&
    (task.notes ?? "").trim().length > 0
  );
}

function getTaskStatusLabel(task: MitigationTask) {
  if (hasCompletedReport(task)) return "Dilaporkan";

  switch (task.status) {
    case "done":
      return "Laporan belum lengkap";
    case "overdue":
      return "Terlambat";
    case "skipped":
      return "Dilewati";
    case "not_reported":
      return "Tidak dilaporkan";
    default:
      return "Belum dilaporkan";
  }
}

function getTaskStatusTone(task: MitigationTask) {
  if (hasCompletedReport(task)) return "success" as const;

  switch (task.status) {
    case "done":
      return "warning" as const;
    case "overdue":
      return "danger" as const;
    case "skipped":
      return "neutral" as const;
    case "not_reported":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}

export function MitigationStatusTable({
  monitoringId,
}: MitigationStatusTableProps) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MitigationTask | null>(
    null,
  );
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);

  const formErrors = useMemo(
    () => validateMitigationReportForm({ evidenceUrl, notes }),
    [evidenceUrl, notes],
  );

  const loadData = useCallback(async () => {
    if (!token || !monitoringId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listMonitoringTasks(token, monitoringId);
      setTasks(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Laporan mitigasi belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, monitoringId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenReport = (task: MitigationTask) => {
    setSelectedTask(task);
    setEvidenceUrl(task.evidenceUrl || "");
    setNotes(task.notes || "");
    setShowValidationErrors(false);
    setIsReportDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedTask || !token) return;

    if (Object.keys(formErrors).length > 0) {
      setShowValidationErrors(true);
      window.requestAnimationFrame(() => {
        if (formErrors.evidenceUrl) {
          evidenceInputRef.current?.focus();
        } else if (formErrors.notes) {
          notesInputRef.current?.focus();
        }
      });
      toast.error("Lengkapi seluruh field wajib sebelum mengirim laporan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedTask = await updateTaskReport(
        token,
        selectedTask.id,
        {
          status: "done",
          ...normalizeMitigationReportPayload({ evidenceUrl, notes }),
        },
      );
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
        ),
      );
      setIsReportDialogOpen(false);
      toast.success("Progress berhasil dilaporkan.");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Gagal mengirim laporan progress.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="rounded-lg bg-state-surface px-3 py-2 text-sm leading-6 text-state-foreground">
        Memuat laporan mitigasi...
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">Laporan mitigasi tidak tersedia</p>
          <p className="text-xs text-amber-800/80">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg bg-state-surface p-3 text-state-foreground">
        <p className="text-sm font-medium leading-6 text-state-foreground">
          Belum ada tugas mitigasi pada periode ini
        </p>
        <p className="mt-1 text-sm leading-6 text-state-foreground/80">
          Finalisasi dapat dilakukan tanpa laporan mitigasi.
        </p>
      </div>
    );
  }

  const doneCount = tasks.filter(hasCompletedReport).length;
  const pendingCount = tasks.length - doneCount;
  const reportableCount = tasks.filter(
    (task) =>
      task.status === "pending" ||
      task.status === "overdue" ||
      (task.status === "done" && !hasCompletedReport(task)),
  ).length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">Status pelaporan</p>
        <Badge
          size="micro"
          tone={pendingCount === 0 ? "success" : "warning"}
        >
          {doneCount}/{tasks.length} dilaporkan
        </Badge>
      </div>
      <Progress
        value={progressPct}
        className="h-1.5"
        aria-label={`${progressPct}% laporan mitigasi selesai`}
      />
      <dl className="space-y-0.5">
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-[13px] text-muted-foreground">Total mitigasi</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {tasks.length}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-[13px] text-muted-foreground">Sudah dilaporkan</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {doneCount}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-[13px] text-muted-foreground">Belum dilaporkan</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {pendingCount}
          </dd>
        </div>
      </dl>
      {pendingCount > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            aria-controls="monitoring-mitigation-list"
            className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {isExpanded
              ? "Sembunyikan daftar"
              : reportableCount > 0
                ? "Perbarui progres"
                : "Lihat status mitigasi"}
            <ChevronDown
              aria-hidden="true"
              className={`size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
          {isExpanded ? (
            <div
              id="monitoring-mitigation-list"
              role="list"
              aria-label="Daftar mitigasi"
              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-reduce:animate-none"
            >
              {tasks.map((task) => {
                const canReport =
                  task.status === "pending" ||
                  task.status === "overdue" ||
                  (task.status === "done" && !hasCompletedReport(task));

                return (
                  <div
                    key={task.id}
                    role="listitem"
                    className="flex items-start gap-2 border-b border-border/30 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground">
                        {task.mitigationAction || "Mitigasi tanpa nama"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {task.periodLabel}
                        </span>
                        <Badge
                          size="micro"
                          tone={getTaskStatusTone(task)}
                        >
                          {getTaskStatusLabel(task)}
                        </Badge>
                      </div>
                    </div>
                    {canReport ? (
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 gap-1 px-2 text-xs"
                        icon={<Send className="size-3" />}
                        onClick={() => handleOpenReport(task)}
                      >
                        Lapor
                      </ActionButton>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
      <MitigationProgressDialog
        open={isReportDialogOpen}
        onOpenChange={(open) => {
          setIsReportDialogOpen(open);
          if (!open) setShowValidationErrors(false);
        }}
        title={
          <span className="block min-w-0">
            <span className="block">Lapor progres mitigasi</span>
            {selectedTask ? (
              <span className="mt-1 block line-clamp-2 text-xs font-normal leading-5 text-muted-foreground">
                {selectedTask.mitigationAction || "Mitigasi tanpa nama"}
              </span>
            ) : null}
          </span>
        }
        evidenceUrl={evidenceUrl}
        onEvidenceUrlChange={setEvidenceUrl}
        notes={notes}
        onNotesChange={setNotes}
        showValidationErrors={showValidationErrors}
        evidenceError={formErrors.evidenceUrl}
        notesError={formErrors.notes}
        evidenceInputRef={evidenceInputRef}
        notesInputRef={notesInputRef}
        evidenceId="side-monitoring-evidence-url"
        notesId="side-monitoring-notes"
        footerActions={
          <AccentButton
            type="button"
            onClick={handleSubmitReport}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            icon={
              isSubmitting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )
            }
          >
            {isSubmitting ? "Mengirim..." : "Kirim laporan"}
          </AccentButton>
        }
      />
    </div>
  );
}
