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
import type { MitigationTask, MitigationTaskStatus } from "@/types/risk";
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

function getTaskStatusLabel(status: MitigationTaskStatus) {
  switch (status) {
    case "done":
      return "Dilaporkan";
    case "overdue":
      return "Terlambat";
    case "skipped":
      return "Dilewati";
    default:
      return "Pending";
  }
}

function getTaskStatusTone(status: MitigationTaskStatus) {
  switch (status) {
    case "done":
      return "success" as const;
    case "overdue":
      return "danger" as const;
    case "skipped":
      return "neutral" as const;
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
      <p className="py-2 text-xs leading-5 text-muted-foreground">
        Memuat laporan mitigasi...
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">Laporan mitigasi tidak tersedia</p>
          <p className="text-xs text-amber-800/80">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-medium underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3">
        <p className="text-xs font-medium leading-5 text-foreground">
          Belum ada tugas mitigasi pada periode ini
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Finalisasi tetap dapat dilakukan, tetapi progres mitigasi belum
          memiliki laporan.
        </p>
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const pendingCount = tasks.filter(
    (task) => task.status === "pending" || task.status === "overdue",
  ).length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Status pelaporan</p>
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
          <dt className="text-xs text-muted-foreground">Total mitigasi</dt>
          <dd className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {tasks.length}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-xs text-muted-foreground">Sudah dilaporkan</dt>
          <dd className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {doneCount}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-xs text-muted-foreground">Pending</dt>
          <dd className="font-mono text-xs font-semibold tabular-nums text-foreground">
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
            className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {isExpanded ? "Sembunyikan daftar" : "Perbarui progres"}
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
              className="border-t border-border/40 pt-2"
            >
              {tasks.map((task) => {
                const canReport =
                  task.status !== "done" && task.status !== "skipped";

                return (
                  <div
                    key={task.id}
                    role="listitem"
                    className="flex items-start gap-2 border-b border-border/30 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground">
                        {task.mitigationAction || "Mitigasi tanpa nama"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {task.periodLabel}
                        </span>
                        <Badge
                          size="micro"
                          tone={getTaskStatusTone(task.status)}
                        >
                          {getTaskStatusLabel(task.status)}
                        </Badge>
                      </div>
                    </div>
                    {canReport ? (
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 gap-1 px-2 text-[11px]"
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
