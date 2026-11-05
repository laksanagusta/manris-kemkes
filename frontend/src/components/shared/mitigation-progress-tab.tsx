"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MitigationTaskTable } from "./mitigation-task-table";

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Send,
  ExternalLink,
} from "@/components/shared/icons";

import { getMitigationReportLabel } from "@/lib/mitigation-report-status";
import type { MitigationTask } from "@/types/risk";
import {
  parseEvidenceUrls,
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import { getMitigationSubmissionActionState } from "@/lib/mitigation-reporting";
import {
  getLinearStatusBadgeClassName,
  getLinearStatusBadgeTone,
} from "@/lib/linear-status-badge";
import {
  AccentButton,
  ActionButton,
  CollectionEmptyState,
  CollectionTableCard,
  CollectionPagination,
  MitigationProgressFlowDialog,
  type MitigationProgressFlowView,
} from "@/components/shared/design-system";

export interface MitigationProgressDraft {
  taskId: string;
  notes: string;
}

interface MitigationProgressTabProps {
  riskId: string;
  token: string;
  aiDraft?: MitigationProgressDraft | null;
  onAiDraftConsumed?: () => void;
  showTaskList?: boolean;
  readOnly?: boolean;
  loadTasks?: () => Promise<MitigationTask[]>;
  submitReport?: (
    task: MitigationTask,
    report: { notes: string; evidenceUrl: string },
  ) => Promise<void>;
  mitigationFilter?: string;
  onMitigationFilterChange?: (value: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Menunggu",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: <Clock className="size-3" />,
  },
  done: {
    label: "Sudah dilaporkan",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: <CheckCircle2 className="size-3" />,
  },
  overdue: {
    label: "Terlambat",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: <AlertTriangle className="size-3" />,
  },
  skipped: {
    label: "Dilewati",
    color: "bg-muted text-muted-foreground border-border",
    icon: <Clock className="size-3" />,
  },
  not_reported: {
    label: "Tidak dilaporkan",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: <AlertTriangle className="size-3" />,
  },
};

export function MitigationProgressTab({
  riskId,
  token,
  aiDraft,
  onAiDraftConsumed,
  showTaskList = false,
  readOnly = false,
  loadTasks,
  submitReport,
  mitigationFilter = "all",
}: MitigationProgressTabProps) {
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [pagination, setPagination] = useState({
    query: "",
    page: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const requestGeneration = useRef(0);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailTask, setDetailTask] = useState<MitigationTask | null>(null);
  const [showMitigationDialog, setShowMitigationDialog] = useState(false);
  const [dialogView, setDialogView] =
    useState<MitigationProgressFlowView>("detail");
  const [selectedTask, setSelectedTask] = useState<MitigationTask | null>(null);

  // Form state for progress submission
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const appliedDraftTaskIdRef = useRef<string | null>(null);

  const formErrors = useMemo(
    () =>
      validateMitigationReportForm({
        evidenceUrl,
        notes,
      }),
    [evidenceUrl, notes],
  );
  const hasFormErrors = Object.keys(formErrors).length > 0;

  const fetchTasks = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = loadTasks
        ? await loadTasks()
        : await api.get<MitigationTask[]>(`/risks/${riskId}/tasks`, token);
      if (generation === requestGeneration.current) setTasks(data || []);
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      setTasks([]);
      setLoadError(
        error instanceof ApiError && error.status === 404
          ? "Penanganan tidak ditemukan atau tidak dapat diakses."
          : "Daftar penanganan belum dapat dimuat. Coba lagi.",
      );
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [riskId, token, loadTasks]);

  useEffect(() => {
    setSelectedTask(null);
    setDetailTask(null);
    setShowMitigationDialog(false);
    if ((riskId && token) || loadTasks) {
      void fetchTasks();
    }
    return () => {
      requestGeneration.current += 1;
    };
  }, [riskId, token, loadTasks, fetchTasks]);

  const openSubmitDialog = useCallback(
    (task: MitigationTask, draft?: MitigationProgressDraft | null) => {
      if (readOnly) return;
      const submissionWindow = getMitigationSubmissionActionState(
        task.periodEnd,
        task.dueDate,
      );
      if (!submissionWindow.allowed) {
        toast.error(
          submissionWindow.message || "Periode pelaporan belum tersedia.",
        );
        return;
      }
      setSelectedTask(task);
      setDetailTask(task);
      setEvidenceUrl(draft ? "" : task.evidenceUrl || "");
      setNotes(draft ? draft.notes : task.notes || "");
      setShowValidationErrors(false);
      setDialogView("form");
      setShowMitigationDialog(true);
    },
    [readOnly],
  );

  const handleOpenSubmit = (task: MitigationTask) => {
    openSubmitDialog(task);
  };

  useEffect(() => {
    if (readOnly || !aiDraft?.taskId || !tasks.length) {
      if (!aiDraft) {
        appliedDraftTaskIdRef.current = null;
      }
      return;
    }

    if (appliedDraftTaskIdRef.current === aiDraft.taskId) {
      return;
    }

    const matchedTask = tasks.find((task) => task.id === aiDraft.taskId);
    if (
      !matchedTask ||
      !getMitigationSubmissionActionState(
        matchedTask.periodEnd,
        matchedTask.dueDate,
      ).allowed
    )
      return;

    appliedDraftTaskIdRef.current = aiDraft.taskId;
    openSubmitDialog(matchedTask, aiDraft);
    onAiDraftConsumed?.();
    toast.success("Draft laporan mitigasi diisi dari Document Intelligence.");
  }, [aiDraft, onAiDraftConsumed, openSubmitDialog, readOnly, tasks]);

  useEffect(() => {
    if (!showMitigationDialog && !aiDraft) {
      appliedDraftTaskIdRef.current = null;
    }
  }, [aiDraft, showMitigationDialog]);

  const handleOpenDetail = (
    task: MitigationTask,
    trigger: HTMLButtonElement,
  ) => {
    detailTriggerRef.current = trigger;
    setDetailTask(task);
    setDialogView("detail");
    setShowMitigationDialog(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask || readOnly) return;
    const submissionWindow = getMitigationSubmissionActionState(
      selectedTask.periodEnd,
      selectedTask.dueDate,
    );
    if (!submissionWindow.allowed) {
      toast.error(
        submissionWindow.message || "Periode pelaporan belum tersedia.",
      );
      return;
    }
    if (hasFormErrors) {
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
    setSubmitting(true);
    try {
      if (submitReport) {
        await submitReport(selectedTask, { notes, evidenceUrl });
      } else {
        await api.put(
          `/mitigation-tasks/${selectedTask.id}/report`,
          {
            status: "done",
            evidenceUrl,
            notes,
          },
          token,
        );
      }
      toast.success("Laporan pelaksanaan tersimpan.");
      setShowMitigationDialog(false);
      fetchTasks();
    } catch {
      toast.error("Gagal mengirim laporan progress");
    } finally {
      setSubmitting(false);
    }
  };

  const tableTasks = useMemo(() => {
    const statusOrder: Record<string, number> = {
      overdue: 0,
      pending: 1,
      done: 2,
      skipped: 3,
      not_reported: 4,
    };

    return tasks
      .filter((task) => {
        if (
          mitigationFilter !== "all" &&
          task.mitigationId !== mitigationFilter
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const statusDelta =
          (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDelta !== 0) return statusDelta;

        if (a.status === "done" && b.status === "done") {
          const aReported = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
          const bReported = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
          return bReported - aReported;
        }

        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, mitigationFilter]);

  const paginationQuery = JSON.stringify([
    mitigationFilter,
  ]);
  const taskPage = Math.min(
    pagination.query === paginationQuery ? pagination.page : 1,
    Math.max(1, Math.ceil(tableTasks.length / pagination.pageSize)),
  );
  const visibleTasks = tableTasks.slice(
    (taskPage - 1) * pagination.pageSize,
    taskPage * pagination.pageSize,
  );

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    notReported: tasks.filter((t) => t.status === "not_reported").length,
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-state-surface py-6 text-sm text-state-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="ml-2">Memuat task mitigasi...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="space-y-3">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchTasks()}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  const summaryItemClass = "flex items-center justify-between gap-4 py-1.5";

  const summary = tasks.length > 0 ? (
    <div
      className="space-y-0.5"
      role="list"
      aria-label="Ringkasan progres penanganan"
    >
      <div className={summaryItemClass} role="listitem">
        <span className="text-[13px] font-medium text-tertiary-foreground">Total</span>
        <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
          {stats.total}
        </span>
      </div>
      <div className={summaryItemClass} role="listitem">
        <span className="text-[13px] font-medium text-tertiary-foreground">
          Sudah dilaporkan
        </span>
        <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
          {stats.done}
        </span>
      </div>
      <div className={summaryItemClass} role="listitem">
        <span className="text-[13px] font-medium text-tertiary-foreground">Menunggu</span>
        <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
          {stats.pending}
        </span>
      </div>
      <div className={summaryItemClass} role="listitem">
        <span className="text-[13px] font-medium text-tertiary-foreground">Terlambat</span>
        <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
          {stats.overdue}
        </span>
      </div>
      {stats.notReported > 0 ? (
        <div className={summaryItemClass} role="listitem">
          <span className="text-[13px] font-medium text-tertiary-foreground">
            Tidak dilaporkan
          </span>
          <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">
            {stats.notReported}
          </span>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <div className={showTaskList && tasks.length > 0 ? "grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]" : undefined}>
        {showTaskList ? (
          summary && <aside aria-label="Ringkasan pelaporan penanganan" className="order-2 min-w-0 self-start">
            <div className="rounded-2xl bg-muted/30 px-4 py-3">
              {summary}
            </div>
          </aside>
        ) : summary}

        {showTaskList && (
          <div className="order-1 min-w-0 space-y-4">
            <CollectionTableCard>
              {tasks.length === 0 ? (
                <CollectionEmptyState
                  title="Belum ada task penanganan"
                  description="Task akan muncul otomatis saat risiko difinalisasi dan setiap mitigasi hanya memiliki satu laporan."
                />
              ) : tableTasks.length === 0 ? (
                <CollectionEmptyState
                  title="Tidak ada task yang sesuai"
                  description="Coba ubah kata kunci atau filter pencarian."
                />
              ) : (
                <MitigationTaskTable
                  tasks={visibleTasks}
                  readOnly={readOnly}
                  onOpenDetail={handleOpenDetail}
                  onReport={(task, trigger) => {
                    detailTriggerRef.current = trigger;
                    handleOpenSubmit(task);
                  }}
                />
              )}
              {tableTasks.length > 0 ? (
                <CollectionPagination
                  itemLabel="mitigasi"
                  page={taskPage}
                  pageSize={pagination.pageSize}
                  total={tableTasks.length}
                  onPageChange={(page) =>
                    setPagination((current) => ({
                      ...current,
                      query: paginationQuery,
                      page,
                    }))
                  }
                  onPageSizeChange={(pageSize) =>
                    setPagination({ query: paginationQuery, page: 1, pageSize })
                  }
                />
              ) : null}
            </CollectionTableCard>
          </div>
        )}

      </div>

      <MitigationProgressFlowDialog
        open={showMitigationDialog && (!readOnly || dialogView === "detail")}
        onOpenChange={(open) => {
          setShowMitigationDialog(open);
          if (!open) {
            setShowValidationErrors(false);
            setDialogView("detail");
          }
        }}
        onCloseAutoFocus={(event) => {
          if (detailTriggerRef.current?.isConnected) {
            event.preventDefault();
            detailTriggerRef.current.focus();
          }
        }}
        view={dialogView}
        onViewChange={(view) => {
          if (!readOnly || view === "detail") setDialogView(view);
        }}
        detailTitle="Detail Laporan Penanganan"
        detailDescription="Tinjau status, bukti, dan catatan penanganan."
        detailContent={
          detailTask ? (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={getLinearStatusBadgeTone(detailTask.status)}
                    className={getLinearStatusBadgeClassName(detailTask.status)}
                  >
                    {
                      (
                        STATUS_CONFIG[detailTask.status] ||
                        STATUS_CONFIG.pending
                      ).icon
                    }
                    {getMitigationReportLabel(detailTask)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Tenggat</p>
                  <p className="text-sm font-medium">
                    {formatDate(detailTask.dueDate)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Periode</p>
                  <p className="text-sm font-medium">
                    {detailTask.periodLabel || "-"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Laporan Oleh</p>
                  <p className="text-sm font-medium">
                    {detailTask.reportedByName || "Belum ada laporan"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(detailTask.reportedAt)}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-lg font-bold">
                      {detailTask.status === "done"
                        ? "Sudah dilaporkan"
                        : "Belum dilaporkan"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Evidence</p>
                  {parseEvidenceUrls(detailTask.evidenceUrl).length > 0 ? (
                    <div className="flex flex-col items-start gap-1">
                      {parseEvidenceUrls(detailTask.evidenceUrl).map((url) => (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                          key={url}
                          title={url}
                        >
                          Buka bukti{" "}
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium">-</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {detailTask.notes || "Belum ada catatan pelaksanaan."}
                  </p>
                </div>
              </div>
            </div>
          ) : null
        }
        detailAction={
          !readOnly &&
          detailTask &&
          (detailTask.status === "pending" ||
            detailTask.status === "overdue") ? (
            <ActionButton
              variant={
                detailTask.status === "overdue" ? "destructive" : "default"
              }
              size="default"
              icon={<Send className="size-3" />}
              disabled={
                !getMitigationSubmissionActionState(
                  detailTask.periodEnd,
                  detailTask.dueDate,
                ).allowed
              }
              title={
                getMitigationSubmissionActionState(
                  detailTask.periodEnd,
                  detailTask.dueDate,
                ).message
              }
              onClick={() => handleOpenSubmit(detailTask)}
            >
              Isi laporan
            </ActionButton>
          ) : null
        }
        formTitle="Isi laporan"
        onFormCancel={() => setDialogView("detail")}
        evidenceUrl={evidenceUrl}
        onEvidenceUrlChange={setEvidenceUrl}
        notes={notes}
        onNotesChange={setNotes}
        showValidationErrors={showValidationErrors}
        evidenceError={formErrors.evidenceUrl}
        notesError={formErrors.notes}
        evidenceInputRef={evidenceInputRef}
        notesInputRef={notesInputRef}
        evidenceId="mitigation-evidence-url"
        notesId="mitigation-notes"
        footerActions={
          <AccentButton
            onClick={handleSubmitProgress}
            disabled={submitting}
            icon={
              submitting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )
            }
          >
            Kirim Laporan
          </AccentButton>
        }
      />
    </>
  );
}
