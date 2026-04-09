"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  RefreshCw,
} from "lucide-react";

import type { MitigationTask } from "@/types/risk";
import {
  normalizeMitigationReportPayload,
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import { isWithinMitigationSubmissionWindow } from "@/lib/kri-reporting";

interface MitigationProgressTabProps {
  riskId: string;
  token: string;
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
}: MitigationProgressTabProps) {
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MitigationTask | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Form state for progress submission
  const [progressPct, setProgressPct] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const formErrors = useMemo(
    () =>
      validateMitigationReportForm({
        progressPct,
        actualCost,
        evidenceUrl,
        notes,
      }),
    [actualCost, evidenceUrl, notes, progressPct],
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

  const handleOpenSubmit = (task: MitigationTask) => {
    setSelectedTask(task);
    setProgressPct(task.progressPct ? String(task.progressPct) : "");
    setActualCost(task.actualCost ? String(task.actualCost) : "");
    setEvidenceUrl(task.evidenceUrl || "");
    setNotes(task.notes || "");
    setShowValidationErrors(false);
    setShowDialog(true);
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
          actualCost,
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

  const handleGenerateTasks = async () => {
    try {
      const result = await api.post<{
        tasksGenerated: number;
        tasksOverdue: number;
      }>("/mitigation-tasks/generate", {}, token);
      toast.success(
        `${result.tasksGenerated} task baru dibuat, ${result.tasksOverdue} ditandai overdue`,
      );
      fetchTasks();
    } catch {
      toast.error("Gagal generate task");
    }
  };

  // Group tasks by mitigation action
  const groupedTasks = tasks.reduce<Record<string, MitigationTask[]>>(
    (acc, task) => {
      const key = task.mitigationAction || "Lainnya";
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    },
    {},
  );

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
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
              Total Task
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
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="size-4" /> Progress Aktual Mitigasi
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs h-8"
              onClick={handleGenerateTasks}
            >
              <RefreshCw className="size-3.5" /> Generate Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 overflow-hidden">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/60 rounded-lg bg-muted/10">
              <Activity className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Belum Ada Task Mitigasi</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Klik &quot;Generate Task&quot; untuk membuat task berdasarkan
                jadwal mitigasi rutin, atau task akan dibuat otomatis oleh
                sistem setiap jam.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2 text-xs"
                onClick={handleGenerateTasks}
              >
                <RefreshCw className="size-3.5" /> Generate Task Sekarang
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedTasks).map(([action, actionTasks]) => (
                <div key={action} className="min-w-0">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 max-w-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="truncate max-w-[1200px]">{action}</span>
                  </h4>
                  <div className="space-y-2">
                    {actionTasks.map((task) => {
                      const statusCfg =
                        STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">
                                {task.periodLabel}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] gap-1 ${statusCfg.color}`}
                              >
                                {statusCfg.icon} {statusCfg.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>
                                Tenggat:{" "}
                                {new Date(task.dueDate).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              {task.reportedByName && (
                                <span>Oleh: {task.reportedByName}</span>
                              )}
                            </div>
                            {task.status === "done" && (
                              <div className="mt-2">
                                <Progress
                                  value={task.progressPct}
                                  className="h-1.5"
                                />
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    {task.progressPct}%
                                  </span>
                                  {task.notes && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                      {task.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
{(task.status === "pending" ||
                            task.status === "overdue") && (
                              (() => {
                                const submissionCheck = isWithinMitigationSubmissionWindow(
                                  task.periodEnd,
                                  task.dueDate,
                                );
                                if (!submissionCheck.allowed) {
                                  return (
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
                                            >
                                              <Send className="size-3" /> Lapor
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[220px] text-xs">
                                          {submissionCheck.message}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                }
                                return (
                                  <Button
                                    size="sm"
                                    variant={
                                      task.status === "overdue"
                                        ? "destructive"
                                        : "default"
                                    }
                                    className="gap-1.5 text-xs h-8 shrink-0"
                                    onClick={() => handleOpenSubmit(task)}
                                  >
                                    <Send className="size-3" /> Lapor
                                  </Button>
                                );
                              })()
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Progress Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Lapor Progress Mitigasi
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
                Biaya Aktual (Rp)
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="text-xs"
                placeholder="0"
                aria-invalid={Boolean(
                  showValidationErrors && formErrors.actualCost,
                )}
                aria-describedby={
                  showValidationErrors && formErrors.actualCost
                    ? "mitigation-cost-error"
                    : undefined
                }
              />
              {showValidationErrors && formErrors.actualCost && (
                <p
                  id="mitigation-cost-error"
                  className="text-[11px] text-destructive"
                >
                  {formErrors.actualCost}
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
