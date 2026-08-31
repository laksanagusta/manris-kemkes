"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Send,
  ExternalLink,
} from "@/components/ui/icons";

import type { MitigationTask } from "@/types/risk";
import {
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import { isWithinMitigationSubmissionWindow } from "@/lib/mitigation-reporting";
import { getLinearStatusBadgeTone } from "@/lib/linear-status-badge";
import {
  AccentButton,
  ActionButton,
  CollectionDialogCancel,
  MitigationProgressDialog,
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
    label: "Selesai",
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
};

export function MitigationProgressTab({
  riskId,
  token,
  aiDraft,
  onAiDraftConsumed,
  showTaskList = false,
}: MitigationProgressTabProps) {
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailTask, setDetailTask] = useState<MitigationTask | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MitigationTask | null>(null);
  const [showDialog, setShowDialog] = useState(false);

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
    setLoading(true);
    try {
      const data = await api.get<MitigationTask[]>(
        `/risks/${riskId}/tasks`,
        token,
      );
      setTasks(data || []);
    } catch {
      // silent fail on 404
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [riskId, token]);

  useEffect(() => {
    if (riskId && token) {
      fetchTasks();
    }
  }, [riskId, token, fetchTasks]);

  const openSubmitDialog = useCallback(
    (task: MitigationTask, draft?: MitigationProgressDraft | null) => {
      setSelectedTask(task);
      setEvidenceUrl(draft ? "" : task.evidenceUrl || "");
      setNotes(draft ? draft.notes : task.notes || "");
      setShowValidationErrors(false);
      setShowDialog(true);
    },
    [],
  );

  const handleOpenSubmit = (task: MitigationTask) => {
    openSubmitDialog(task);
  };

  useEffect(() => {
    if (!aiDraft?.taskId || !tasks.length) {
      if (!aiDraft) {
        appliedDraftTaskIdRef.current = null;
      }
      return;
    }

    if (appliedDraftTaskIdRef.current === aiDraft.taskId) {
      return;
    }

    const matchedTask = tasks.find((task) => task.id === aiDraft.taskId);
    if (!matchedTask) return;

    appliedDraftTaskIdRef.current = aiDraft.taskId;
    openSubmitDialog(matchedTask, aiDraft);
    onAiDraftConsumed?.();
    toast.success("Draft laporan mitigasi diisi dari Document Intelligence.");
  }, [aiDraft, onAiDraftConsumed, openSubmitDialog, tasks]);

  useEffect(() => {
    if (!showDialog && !aiDraft) {
      appliedDraftTaskIdRef.current = null;
    }
  }, [aiDraft, showDialog]);

  const handleOpenDetail = (task: MitigationTask) => {
    setDetailTask(task);
    setShowDetailDialog(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask) return;
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
      await api.put(
        `/mitigation-tasks/${selectedTask.id}/report`,
        {
          status: "done",
          evidenceUrl,
          notes,
        },
        token,
      );
      toast.success("Progress berhasil dilaporkan!");
      setShowDialog(false);
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
    };

    return [...tasks].sort((a, b) => {
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
  }, [tasks]);

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
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
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="ml-2">Memuat task mitigasi...</span>
      </div>
    );
  }

  return (
    <>
      {/* Summary Stats */}
      {tasks.length > 0 && (
        <div
          className="space-y-0.5"
          role="list"
          aria-label="Ringkasan progres penanganan"
        >
          <div
            className="flex items-center justify-between gap-4 py-1.5"
            role="listitem"
          >
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {stats.total}
            </span>
          </div>
          <div
            className="flex items-center justify-between gap-4 py-1.5"
            role="listitem"
          >
            <span className="text-xs text-muted-foreground">Selesai</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {stats.done}
            </span>
          </div>
          <div
            className="flex items-center justify-between gap-4 py-1.5"
            role="listitem"
          >
            <span className="text-xs text-muted-foreground">Menunggu</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {stats.pending}
            </span>
          </div>
          <div
            className="flex items-center justify-between gap-4 py-1.5"
            role="listitem"
          >
            <span className="text-xs text-muted-foreground">Terlambat</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {stats.overdue}
            </span>
          </div>
        </div>
      )}

      {showTaskList && (
        <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Progress Aktual Penanganan
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pantau progres task penanganan yang sedang berjalan, termasuk
            status, tenggat, dan laporan realisasi terbaru.
          </p>
        </div>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/10 p-8 text-center">
            <Activity className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Belum Ada Task Penanganan</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Task akan muncul otomatis saat risiko difinalisasi dan setiap
              mitigasi hanya memiliki satu laporan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <Table className="min-w-[980px] w-full">
              <TableHeader className="bg-table-header">
                <TableRow className="h-auto text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-4 py-3 font-semibold">Kode</TableHead>
                  <TableHead className="px-4 py-3 font-semibold">Rencana</TableHead>
                  <TableHead className="px-4 py-3 font-semibold">Periode</TableHead>
                  <TableHead className="px-4 py-3 font-semibold">Tenggat</TableHead>
                  <TableHead className="px-4 py-3 font-semibold">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold">Progress</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableTasks.map((task) => {
                  const statusCfg =
                    STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  const submissionCheck =
                    task.status === "pending" || task.status === "overdue"
                      ? isWithinMitigationSubmissionWindow(
                          task.periodEnd,
                          task.dueDate,
                        )
                      : null;

                  return (
                    <TableRow
                      key={task.id}
                      className="h-auto cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/30"
                      onClick={() => handleOpenDetail(task)}
                    >
                      <TableCell className="px-4 py-3 align-top">
                        <div className="text-xs font-semibold text-foreground">
                          {task.riskCode || "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {task.riskTitle || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="max-w-[360px] text-sm font-medium text-foreground line-clamp-2">
                          {task.mitigationAction || "—"}
                        </div>
                        {task.mitigationOwner && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            PIC: {task.mitigationOwner}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top text-sm text-foreground">
                        {task.periodLabel || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top text-sm text-foreground">
                        {formatDate(task.dueDate)}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <Badge
                          tone={getLinearStatusBadgeTone(task.status)}
                          size="compact"
                        >
                          {statusCfg.icon} {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <Progress
                            value={task.status === "done" ? 100 : 0}
                            className="h-1.5"
                          />
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {task.status === "done"
                                ? "Selesai"
                                : "Belum dilaporkan"}
                            </span>
                            {task.reportedByName &&
                              task.status === "done" && (
                                <span className="max-w-[150px] truncate">
                                  {task.reportedByName}
                                </span>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right align-top">
                        {(task.status === "pending" ||
                          task.status === "overdue") && (
                          <>
                            {submissionCheck && !submissionCheck.allowed ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block cursor-not-allowed">
                                      <Button
                                        size="sm"
                                        variant={
                                          task.status === "overdue"
                                            ? "destructive"
                                            : "default"
                                        }
                                        disabled
                                        className="pointer-events-none opacity-50"
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        <Send className="size-3" /> Lapor
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    className="max-w-[220px] text-xs"
                                  >
                                    {submissionCheck.message}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Button
                                size="sm"
                                variant={
                                  task.status === "overdue"
                                    ? "destructive"
                                    : "default"
                                }
                                className="h-8 shrink-0 gap-1.5 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenSubmit(task);
                                }}
                              >
                                <Send className="size-3" /> Lapor
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl no-scrollbar" showCloseButton={false}>
          <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
            <DialogTitle className="text-base">
              Detail Laporan Penanganan
            </DialogTitle>
          </DialogHeader>

          {detailTask && (
            <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    tone={getLinearStatusBadgeTone(detailTask.status)}
                    size="compact"
                  >
                    {
                      (
                        STATUS_CONFIG[detailTask.status] ||
                        STATUS_CONFIG.pending
                      ).icon
                    }
                    {
                      (
                        STATUS_CONFIG[detailTask.status] ||
                        STATUS_CONFIG.pending
                      ).label
                    }
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
                    <p className="text-sm text-muted-foreground">
                      Progress
                    </p>
                    <p className="text-lg font-bold">
                      {detailTask.status === "done"
                        ? "Selesai"
                        : "Belum dilaporkan"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">Evidence</p>
                  {detailTask.evidenceUrl ? (
                    <a
                      href={detailTask.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Buka bukti <ExternalLink className="size-3.5" />
                    </a>
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
          )}

          <DialogFooter className="gap-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms] sm:justify-between">
            <CollectionDialogCancel onClick={() => setShowDetailDialog(false)}>
              Tutup
            </CollectionDialogCancel>
            {detailTask &&
              (detailTask.status === "pending" ||
                detailTask.status === "overdue") && (
                <ActionButton
                  variant={
                    detailTask.status === "overdue" ? "destructive" : "primary"
                  }
                  size={detailTask.status === "overdue" ? "md" : "primary"}
                  icon={<Send className="size-3" />}
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleOpenSubmit(detailTask);
                  }}
                >
                  Lapor Progress
                </ActionButton>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Progress Dialog */}
      <MitigationProgressDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Lapor Progress Penanganan"
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
