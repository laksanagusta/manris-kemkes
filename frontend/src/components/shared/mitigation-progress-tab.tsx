"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
} from "lucide-react";

import type { MitigationTask } from "@/types/risk";
import {
  normalizeMitigationReportPayload,
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import { isWithinMitigationSubmissionWindow } from "@/lib/kri-reporting";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";

export interface MitigationProgressDraft {
  taskId: string;
  progressPct: number;
  notes: string;
}

interface MitigationProgressTabProps {
  riskId: string;
  token: string;
  aiDraft?: MitigationProgressDraft | null;
  onAiDraftConsumed?: () => void;
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
    color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    icon: <Clock className="size-3" />,
  },
};

export function MitigationProgressTab({
  riskId,
  token,
  aiDraft,
  onAiDraftConsumed,
}: MitigationProgressTabProps) {
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailTask, setDetailTask] = useState<MitigationTask | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MitigationTask | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Form state for progress submission
  const [progressPct, setProgressPct] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const appliedDraftTaskIdRef = useRef<string | null>(null);

  const formErrors = useMemo(
    () =>
      validateMitigationReportForm({
        progressPct,
        evidenceUrl,
        notes,
      }),
    [evidenceUrl, notes, progressPct],
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
      setProgressPct(
        draft
          ? String(draft.progressPct)
          : task.progressPct
            ? String(task.progressPct)
            : "",
      );
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
      toast.error("Lengkapi seluruh field wajib sebelum mengirim laporan.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        `/mitigation-tasks/${selectedTask.id}/submit`,
        normalizeMitigationReportPayload({
          progressPct,
          evidenceUrl,
          notes,
        }),
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
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Memuat task mitigasi...
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Summary Stats */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total
            </p>
          </div>
          <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.done}</p>
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider">
              Selesai
            </p>
          </div>
          <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-[10px] text-amber-600 uppercase tracking-wider">
              Menunggu
            </p>
          </div>
          <div className="rounded-xl border bg-red-500/5 border-red-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-[10px] text-red-600 uppercase tracking-wider">
              Terlambat
            </p>
          </div>
        </div>
      )}

      {/* Task List */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-bold">
            Progress Aktual Penanganan
          </CardTitle>
          <CardDescription className="text-xs leading-5">
            Pantau progres task penanganan yang sedang berjalan, termasuk
            status, tenggat, dan laporan realisasi terbaru.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 overflow-hidden">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/60 rounded-lg bg-muted/10">
              <Activity className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Belum Ada Task Penanganan</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Task akan muncul otomatis saat risiko difinalisasi dan setiap
                mitigasi hanya memiliki satu laporan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="min-w-[980px] w-full">
                <thead className="bg-muted/40">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Kode</th>
                    <th className="px-4 py-3 font-semibold">Rencana</th>
                    <th className="px-4 py-3 font-semibold">Periode</th>
                    <th className="px-4 py-3 font-semibold">Tenggat</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
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
                      <tr
                        key={task.id}
                        className="cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/30"
                        onClick={() => handleOpenDetail(task)}
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="text-xs font-semibold text-foreground">
                            {task.riskCode || "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {task.riskTitle || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="max-w-[360px] text-sm font-medium text-foreground line-clamp-2">
                            {task.mitigationAction || "—"}
                          </div>
                          {task.mitigationOwner && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              PIC: {task.mitigationOwner}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-foreground">
                          {task.periodLabel || "—"}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-foreground">
                          {formatDate(task.dueDate)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge
                            className={getLinearStatusBadgeClass(task.status)}
                          >
                            {statusCfg.icon} {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <Progress
                              value={
                                task.status === "done" ? task.progressPct : 0
                              }
                              className="h-1.5"
                            />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {task.status === "done"
                                  ? `${task.progressPct}%`
                                  : "Belum dilaporkan"}
                              </span>
                              {task.reportedByName &&
                                task.status === "done" && (
                                  <span className="truncate max-w-[150px]">
                                    {task.reportedByName}
                                  </span>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
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
                                          className="opacity-50 pointer-events-none"
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
                                  className="gap-1.5 text-xs h-8 shrink-0"
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Detail Laporan Penanganan
            </DialogTitle>
            <DialogDescription className="text-xs">
              {detailTask?.mitigationAction || "-"} -{" "}
              {detailTask?.periodLabel || "-"}
            </DialogDescription>
          </DialogHeader>

          {detailTask && (
            <div className="space-y-4 py-2">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Status
                  </p>
                  <Badge
                    className={getLinearStatusBadgeClass(detailTask.status)}
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
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tenggat
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {formatDate(detailTask.dueDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Periode
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {detailTask.periodLabel || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Laporan Oleh
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {detailTask.reportedByName || "Belum ada laporan"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(detailTask.reportedAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Progress
                    </p>
                    <p className="text-lg font-bold">
                      {detailTask.status === "done"
                        ? `${detailTask.progressPct}%`
                        : "Belum dilaporkan"}
                    </p>
                  </div>
                  <Progress
                    value={
                      detailTask.status === "done" ? detailTask.progressPct : 0
                    }
                    className="h-2 flex-1 max-w-xs"
                  />
                </div>
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Evidence
                  </p>
                  {detailTask.evidenceUrl ? (
                    <a
                      href={detailTask.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Buka bukti <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-medium">-</p>
                  )}
                </div>
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Catatan
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {detailTask.notes || "Belum ada catatan pelaksanaan."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {detailTask &&
              (detailTask.status === "pending" ||
                detailTask.status === "overdue") && (
                <Button
                  size="sm"
                  variant={
                    detailTask.status === "overdue" ? "destructive" : "default"
                  }
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleOpenSubmit(detailTask);
                  }}
                >
                  <Send className="size-3" />
                  Lapor Progress
                </Button>
              )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailDialog(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Progress Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Lapor Progress Penanganan
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTask?.mitigationAction} — {selectedTask?.periodLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Persentase Penyelesaian
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressPct}
                  onChange={(e) => setProgressPct(e.target.value)}
                  className="text-xs w-24"
                  placeholder="0"
                  aria-invalid={Boolean(
                    showValidationErrors && formErrors.progressPct,
                  )}
                  aria-describedby={
                    showValidationErrors && formErrors.progressPct
                      ? "mitigation-progress-error"
                      : undefined
                  }
                />
                <span className="text-xs text-muted-foreground">%</span>
                <Progress
                  value={Number(progressPct || 0)}
                  className="flex-1 h-2"
                />
              </div>
              {showValidationErrors && formErrors.progressPct && (
                <p
                  id="mitigation-progress-error"
                  className="text-[11px] text-destructive"
                >
                  {formErrors.progressPct}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Link Bukti / Evidence
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="text-xs"
                placeholder="https://drive.google.com/..."
                aria-invalid={Boolean(
                  showValidationErrors && formErrors.evidenceUrl,
                )}
                aria-describedby={
                  showValidationErrors && formErrors.evidenceUrl
                    ? "mitigation-evidence-error"
                    : undefined
                }
              />
              {showValidationErrors && formErrors.evidenceUrl && (
                <p
                  id="mitigation-evidence-error"
                  className="text-[11px] text-destructive"
                >
                  {formErrors.evidenceUrl}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Catatan Pelaksanaan
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[80px]"
                placeholder="Jelaskan pencapaian atau kendala yang dihadapi..."
                aria-invalid={Boolean(showValidationErrors && formErrors.notes)}
                aria-describedby={
                  showValidationErrors && formErrors.notes
                    ? "mitigation-notes-error"
                    : undefined
                }
              />
              {showValidationErrors && formErrors.notes && (
                <p
                  id="mitigation-notes-error"
                  className="text-[11px] text-destructive"
                >
                  {formErrors.notes}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDialog(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitProgress}
              disabled={submitting || hasFormErrors}
              className="gap-2 text-xs"
            >
              {submitting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
              Kirim Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
