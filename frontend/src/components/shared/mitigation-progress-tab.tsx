"use client";

import { formatDisplayDate } from "@/lib/display-date";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { getMitigationTask, listScopedTaskPage, type ScopedTaskPage, updateTaskReport } from "@/lib/api/mitigation-tasks";
import { toast } from "sonner";

import { useRouter } from "next/navigation";
import { MitigationExecutionField, type MitigationExecution } from "@/components/shared/design-system/domain/mitigation-execution-field";
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
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import {
  getLinearStatusBadgeClassName,
  getLinearStatusBadgeTone,
} from "@/lib/linear-status-badge";
import {
  AccentButton,
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
  monitoringId?: string;
  token: string;
  aiDraft?: MitigationProgressDraft | null;
  onAiDraftConsumed?: () => void;
  showTaskList?: boolean;
  readOnly?: boolean;
  allowInMonitoring?: boolean;
  loadTasks?: () => Promise<MitigationTask[]>;
  submitReport?: (
    task: MitigationTask,
    report: { notes: string; evidenceUrl: string; status?:string },
  ) => Promise<MitigationTask>;
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
  monitoringId,
  token,
  aiDraft,
  onAiDraftConsumed,
  showTaskList = false,
  readOnly = false,
  allowInMonitoring = false,
  loadTasks,
  submitReport,
  mitigationFilter = "all",
}: MitigationProgressTabProps) {
  const router=useRouter();
  const [execution,setExecution]=useState<MitigationExecution>("pending");
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [pagination, setPagination] = useState({
    query: "",
    page: 1,
    pageSize: 10,
  });
  const [serverPage, setServerPage] = useState<ScopedTaskPage | null>(null);
  const localData = Boolean(loadTasks);
  const paginationQuery = JSON.stringify([riskId, monitoringId, mitigationFilter]);
  const requestedPage = pagination.query === paginationQuery ? pagination.page : 1;
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
  const [submitError, setSubmitError] = useState("");
  const detailReportAction = detailTask ? getMitigationTaskReportAction(detailTask, undefined, allowInMonitoring && !readOnly) : null;
  const detailStatus = detailReportAction?.isOverdue ? "overdue" : detailTask?.status;
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
      if (loadTasks) {
        const data = await loadTasks();
        if (generation === requestGeneration.current) setTasks(data || []);
      } else {
        const result = await listScopedTaskPage(token, { riskId, monitoringId }, {
          page: requestedPage,
          limit: showTaskList ? pagination.pageSize : 1,
          mitigationId: mitigationFilter,
        });
        if (generation !== requestGeneration.current) return;
        setServerPage(result);
        const lastPage = Math.max(1, Math.ceil(result.total / pagination.pageSize));
        if (requestedPage > lastPage) {
          setPagination((current) => ({ ...current, query: paginationQuery, page: lastPage }));
          return;
        }
        setTasks(result.data);
      }
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
  }, [riskId, monitoringId, token, loadTasks, requestedPage, pagination.pageSize, showTaskList, mitigationFilter, paginationQuery]);

  useEffect(() => {
    setSelectedTask(null);
    setDetailTask(null);
    setShowMitigationDialog(false);
    if (((riskId || monitoringId) && token) || loadTasks) {
      void fetchTasks();
    }
    return () => {
      requestGeneration.current += 1;
    };
  }, [riskId, monitoringId, token, loadTasks, fetchTasks]);

  const openSubmitDialog = useCallback(
    (task: MitigationTask, draft?: MitigationProgressDraft | null) => {
      if (readOnly) return;
      if(!allowInMonitoring){router.push(task.monitoringId ? `/risk/monitoring/${task.monitoringId}` : `/risk/register/new?id=${task.riskId}&tab=monitoring`);return;}
      if (!getMitigationTaskReportAction(task, undefined, allowInMonitoring && !readOnly).allowed) return;
      setExecution(task.status === "skipped" ? "skipped" : task.status === "done" ? "done" : "pending");
      setSelectedTask(task);
      setDetailTask(task);
      setEvidenceUrl(draft ? "" : task.evidenceUrl || "");
      setNotes(draft ? draft.notes : task.notes || "");
      setShowValidationErrors(false);
      setSubmitError("");
      setDialogView("form");
      setShowMitigationDialog(true);
    },
    [readOnly, allowInMonitoring, router],
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
      !getMitigationTaskReportAction(matchedTask, undefined, allowInMonitoring && !readOnly).allowed
    )
      return;

    appliedDraftTaskIdRef.current = aiDraft.taskId;
    openSubmitDialog(matchedTask, aiDraft);
    onAiDraftConsumed?.();
    toast.success("Draft laporan mitigasi diisi dari Document Intelligence.");
  }, [aiDraft, allowInMonitoring, onAiDraftConsumed, openSubmitDialog, readOnly, tasks]);

  useEffect(() => {
    if (localData || readOnly || !aiDraft?.taskId || loading || tasks.some((task) => task.id === aiDraft.taskId)) return;
    if (appliedDraftTaskIdRef.current === aiDraft.taskId) return;
    let active = true;
    getMitigationTask(token, aiDraft.taskId).then((task) => {
      if (!active || (monitoringId ? task.monitoringId !== monitoringId : task.riskId !== riskId)) return;
      if (!getMitigationTaskReportAction(task, undefined, allowInMonitoring && !readOnly).allowed) return;
      appliedDraftTaskIdRef.current = task.id;
      openSubmitDialog(task, aiDraft);
      onAiDraftConsumed?.();
      toast.success("Draft laporan mitigasi diisi dari Document Intelligence.");
    }).catch(() => {
      if (active) toast.error("Tugas untuk draft laporan belum dapat dimuat.");
    });
    return () => { active = false; };
  }, [localData, readOnly, aiDraft, loading, tasks, token, monitoringId, riskId, allowInMonitoring, openSubmitDialog, onAiDraftConsumed]);

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
    if (!selectedTask || readOnly || submitting) return;
    setSubmitError("");
    const action = getMitigationTaskReportAction(selectedTask, undefined, allowInMonitoring && !readOnly);
    if (!action.allowed) {
      setSubmitError(action.message || "Pelaporan untuk tugas ini sudah ditutup.");
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
      return;
    }
    setSubmitting(true);
    try {
      const updated = submitReport
        ? await submitReport(selectedTask, { notes, evidenceUrl, status:execution })
        : await updateTaskReport(token, selectedTask.id, { status: execution, evidenceUrl, notes });
      setDetailTask(updated);
      setSelectedTask(null);
      setShowValidationErrors(false);
      setDialogView("detail");
      setShowMitigationDialog(false);
      toast.success("Laporan mitigasi berhasil dikirim.");
      void fetchTasks();
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.status < 500
        ? error.message
        : "Pengiriman belum terkonfirmasi. Isian tetap tersedia. Coba kirim lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const tableTasks = useMemo(() => {
    if (!localData) return tasks;
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
  }, [tasks, mitigationFilter, localData]);

  const totalTasks = localData ? tableTasks.length : serverPage?.total ?? 0;
  const taskPage = Math.min(requestedPage, Math.max(1, Math.ceil(totalTasks / pagination.pageSize)));
  const visibleTasks = localData ? tableTasks.slice(
    (taskPage - 1) * pagination.pageSize,
    taskPage * pagination.pageSize,
  ) : tableTasks;

  const stats = localData ? {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    notReported: tasks.filter((t) => t.status === "not_reported").length,
  } : serverPage?.summary ?? { total: 0, done: 0, pending: 0, overdue: 0, notReported: 0 };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatDisplayDate(parsed, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return formatDisplayDate(parsed, {
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

  const summary = stats.total > 0 ? (
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
      {!showTaskList && summary}
      {showTaskList && (
        <CollectionTableCard>
          {stats.total === 0 ? (
            <CollectionEmptyState
              title="Belum ada task penanganan"
              description="Item pelaporan tersedia saat pemantauan dimulai. Setiap pemantauan menyimpan laporan mitigasinya sendiri."
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
              total={totalTasks}
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
      )}

      <MitigationProgressFlowDialog
        open={showMitigationDialog && (!readOnly || dialogView === "detail")}
        onOpenChange={(open) => {
          setShowMitigationDialog(open);
          if (!open) {
            setShowValidationErrors(false);
            setSelectedTask(null);
            setSubmitError("");
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
        reportTask={detailTask}
        availabilityMessage={detailReportAction?.allowed ? undefined : detailReportAction?.message}
        submitError={submitError}
        dirty={Boolean(selectedTask && (
          notes !== (selectedTask.notes || "") ||
          evidenceUrl !== (selectedTask.evidenceUrl || "") || execution !== selectedTask.status
        ))}
        submitting={submitting}
        onViewChange={(view) => {
          if (!readOnly || view === "detail") setDialogView(view);
        }}
        detailTitle="Detail Laporan Penanganan"
        detailDescription="Tinjau status, bukti, dan catatan penanganan."
        detailContent={
          detailTask ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium">{detailTask.mitigationAction || "Tindakan penanganan"}</p>
                <p className="text-xs text-muted-foreground">{detailTask.riskCode}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={getLinearStatusBadgeTone(detailStatus ?? detailTask.status)}
                    className={getLinearStatusBadgeClassName(detailStatus ?? detailTask.status)}
                  >
                    {
                      (
                        STATUS_CONFIG[detailStatus ?? detailTask.status] ||
                        STATUS_CONFIG.pending
                      ).icon
                    }
                    {getMitigationReportLabel({ ...detailTask, status: detailStatus ?? detailTask.status })}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Tenggat</p>
                  <p className="text-sm font-medium">
                    <span data-date-time="">{formatDate(detailTask.dueDate)}</span>
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
                    {detailTask.reportedByName || detailTask.reportedBy || "Belum ada laporan"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span data-date-time="">{formatDateTime(detailTask.reportedAt)}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Link Bukti</p>
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
          !readOnly && detailTask && detailReportAction?.allowed ? (
            <AccentButton
              icon={<Send className="size-3" />}
              onClick={() => {
                if (selectedTask?.id === detailTask.id) setDialogView("form");
                else handleOpenSubmit(detailTask);
              }}
            >
              {detailReportAction.label}
            </AccentButton>
          ) : null
        }
        formTitle={detailReportAction?.allowed ? detailReportAction.label : "Isi laporan"}
        onFormCancel={() => setDialogView("detail")}
        leadingContent={allowInMonitoring && <MitigationExecutionField value={execution} onChange={setExecution} disabled={submitting} />}
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
            {submitting ? "Mengirim…" : submitError ? "Coba kirim lagi" : "Kirim laporan"}
          </AccentButton>
        }
      />
    </>
  );
}
