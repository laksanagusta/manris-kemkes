"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Clock,
  AlertTriangle,
  Bell,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Send,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  normalizeMitigationReportPayload,
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import { isWithinMitigationSubmissionWindow } from "@/lib/kri-reporting";
import type { MitigationTask } from "@/types/risk";

const levelBadgeVariant: Record<string, string> = {
  Pending: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Overdue: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  Selesai: "bg-risk-low/15 text-risk-low border-risk-low/20",
};

const tierConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  upcoming: { label: "Akan Datang", color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border/50" },
  reminder: { label: "Reminder", color: "text-risk-medium", bg: "bg-risk-medium/10", border: "border-risk-medium/20" },
  light: { label: "Overdue Ringan", color: "text-risk-high", bg: "bg-risk-high/10", border: "border-risk-high/20" },
  heavy: { label: "Overdue Berat", color: "text-risk-extreme", bg: "bg-risk-extreme/10", border: "border-risk-extreme/20" },
};

type MitigationTaskRow = MitigationTask & {
  tier: keyof typeof tierConfig;
  level: keyof typeof levelBadgeVariant;
  unit: string;
  pic: string;
  daysOverdue: number;
  mitigationAction: string;
  title: string;
};

export function MitigationMonitoringPanel() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const parsePositiveInt = (val: string | null, fallback: number) => {
    const num = parseInt(val || "", 10);
    return isNaN(num) || num <= 0 ? fallback : num;
  };

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 10);

  const [mitigations, setMitigations] = useState<MitigationTaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<MitigationTaskRow | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MitigationTaskRow | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    [actualCost, evidenceUrl, notes, progressPct]
  );
  const hasFormErrors = Object.keys(formErrors).length > 0;

  const fetchMitigations = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await api.get<{ data: MitigationTask[]; total: number }>(
        `/mitigation-tasks/all?page=${page}&limit=${limit}`,
        token
      );
      
      const rawData = response.data || [];
      setTotal(response.total || 0);

      const processed: MitigationTaskRow[] = rawData.map((m) => {
        const dueDate = new Date(m.dueDate);
        const today = new Date();

        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let tier: MitigationTaskRow["tier"] = "upcoming";
        if (daysOverdue > 7) tier = "heavy";
        else if (daysOverdue > 0) tier = "light";
        else if (daysOverdue >= -7) tier = "reminder";

        const backendStatus = m.status;

        return {
          ...m,
          riskCode: m.riskCode || "—",
          title: m.riskTitle || "—",
          unit: m.mitigationOwner || "—",
          pic: m.mitigationOwner || "—",
          daysOverdue,
          level: backendStatus === "done" ? "Selesai" : backendStatus === "overdue" ? "Overdue" : "Pending",
          tier,
          mitigationAction: m.mitigationAction || "—",
          status: backendStatus,
          progressPct: m.progressPct || 0,
        };
      });

      const statusRank = (status: string) => {
        switch (status) {
          case "overdue":
            return 0;
          case "pending":
            return 1;
          case "done":
            return 2;
          case "skipped":
            return 3;
          default:
            return 4;
        }
      };

      setMitigations(
        processed.sort((a, b) => {
          const statusDelta = statusRank(a.status) - statusRank(b.status);
          if (statusDelta !== 0) return statusDelta;

          if (a.status === "done" && b.status === "done") {
            const aReported = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
            const bReported = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
            return bReported - aReported;
          }

          return b.daysOverdue - a.daysOverdue;
        }),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit]);

  useEffect(() => {
    fetchMitigations();
  }, [fetchMitigations]);

  const handleOpenSubmit = (task: MitigationTask) => {
    setSelectedTask(task);
    setProgressPct(task.progressPct ? String(task.progressPct) : "");
    setActualCost(task.actualCost ? String(task.actualCost) : "");
    setEvidenceUrl(task.evidenceUrl || "");
    setNotes(task.notes || "");
    setShowValidationErrors(false);
    setShowDialog(true);
  };

  const handleOpenDetail = (task: MitigationTask) => {
    setDetailTask(task);
    setShowDetailDialog(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask || !token) return;
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
        token
      );
      toast.success("Progress berhasil dilaporkan!");
      setShowDialog(false);
      await fetchMitigations();
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim laporan progress");
    } finally {
      setSubmitting(false);
    }
  };

  const activeMitigations = mitigations.filter(
    (m) => m.status !== "done" && m.status !== "skipped",
  );
  const completedCount = mitigations.filter((m) => m.status === "done").length;
  const heavyCount = activeMitigations.filter((m) => m.tier === "heavy").length;
  const lightCount = activeMitigations.filter((m) => m.tier === "light").length;
  const reminderCount = activeMitigations.filter(
    (m) => m.tier === "reminder",
  ).length;
  const upcomingCount = activeMitigations.filter(
    (m) => m.tier === "upcoming",
  ).length;

  const totalPages = Math.ceil(total / limit) || 1;

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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Work queue mitigasi
        </p>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Penanganan</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Prioritaskan rencana yang mendekati tenggat atau sudah overdue, lalu kirim progres
            pelaksanaannya dari daftar kerja yang sama.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Penanganan</p>
              <p className="mt-1 text-2xl font-bold">{mitigations.length}</p>
            </div>
            <ShieldAlert className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-risk-extreme/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Overdue Berat</p>
              <p className="mt-1 text-2xl font-bold text-risk-extreme">{heavyCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">H+7 ke atas</p>
            </div>
            <AlertTriangle className="size-5 text-risk-extreme" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-risk-high/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Overdue Ringan</p>
              <p className="mt-1 text-2xl font-bold text-risk-high">{lightCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">H+1 s.d. H+7</p>
            </div>
            <Clock className="size-5 text-risk-high" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-risk-medium/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Reminder</p>
              <p className="mt-1 text-2xl font-bold text-risk-medium">{reminderCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">H-7 s.d. Hari H</p>
            </div>
            <Bell className="size-5 text-risk-medium" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Akan Datang</p>
              <p className="mt-1 text-2xl font-bold text-muted-foreground">{upcomingCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Lebih dari 7 hari</p>
            </div>
            <Clock className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-emerald-500/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Selesai</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{completedCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Laporan masuk</p>
            </div>
            <CheckCircle2 className="size-5 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-[15px] font-semibold">Daftar mitigasi</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tinjau rencana penanganan yang mendekati tenggat, lalu buka detail atau kirim progress langsung dari daftar ini.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-20 whitespace-nowrap text-sm">Kode</TableHead>
                  <TableHead className="whitespace-nowrap text-sm">Rencana Penanganan</TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-sm">Unit / PIC</TableHead>
                  <TableHead className="w-28 whitespace-nowrap text-sm">Jatuh Tempo</TableHead>
                  <TableHead className="w-20 whitespace-nowrap text-center text-sm">Hari</TableHead>
                  <TableHead className="w-20 whitespace-nowrap text-sm">Status</TableHead>
                  <TableHead className="w-28 whitespace-nowrap text-sm">Eskalasi</TableHead>
                  <TableHead className="w-32 whitespace-nowrap text-right text-sm">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Memuat data mitigasi...
                  </div>
                </TableCell>
              </TableRow>
            ) : mitigations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24">
                  <div className="flex flex-col gap-1 text-left">
                    <p className="text-sm font-medium text-muted-foreground">Tidak ada rencana mitigasi yang overdue</p>
                    <p className="text-xs text-muted-foreground/70">Semua rencana mitigasi telah ditangani atau belum mendekati tenggat</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
                  mitigations.map((item) => {
                const tier = tierConfig[item.tier];
                const submissionCheck = isWithinMitigationSubmissionWindow(item.periodEnd, item.dueDate);
                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "cursor-pointer border-border/30 transition-colors hover:bg-muted/20",
                      item.tier === "heavy" && "bg-risk-extreme/[0.02]"
                    )}
                    onClick={() => handleOpenDetail(item)}
                  >
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {item.riskCode}
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <p className="truncate text-sm font-medium leading-relaxed text-primary">
                        {item.mitigationAction}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="truncate text-sm">{item.unit}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{item.pic}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString("id-ID") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          item.daysOverdue > 0 ? tier.color : "text-muted-foreground"
                        )}
                      >
                        {item.daysOverdue > 0 ? `+${item.daysOverdue}` : item.daysOverdue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[10px] font-semibold",
                          levelBadgeVariant[item.level]
                        )}
                      >
                        {item.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[10px] font-semibold",
                          tier.bg,
                          tier.color,
                          tier.border
                        )}
                      >
                        {tier.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === "done" ? (
                        <span className="text-sm text-success">Selesai</span>
                      ) : !submissionCheck.allowed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block cursor-not-allowed">
                                <Button
                                  size="sm"
                                  variant={item.status === "overdue" ? "destructive" : "default"}
                                  disabled
                                  className="pointer-events-none text-sm opacity-50"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Send className="size-3 mr-1" /> Lapor
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] text-xs">
                              {submissionCheck.message}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          size="sm"
                          variant={item.status === "overdue" ? "destructive" : "default"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenSubmit(item);
                          }}
                          className="text-sm"
                        >
                          <Send className="size-3 mr-1" /> Lapor
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/30 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Baris per halaman:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("limit", val);
                    params.set("page", "1");
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                  }}
                >
                  <SelectTrigger className="h-7 w-[65px] border-none bg-muted/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} mitigasi
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                disabled={page === 1 || loading}
                onClick={() => handlePageChange(Math.max(1, page - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 bg-primary/10 text-xs font-medium text-primary"
                disabled
              >
                {page}
              </Button>
              <span className="px-1 text-xs text-muted-foreground">
                dari {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                disabled={page === totalPages || total === 0 || loading}
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Detail Laporan Penanganan
            </DialogTitle>
            <DialogDescription className="text-xs">
              {detailTask?.mitigationAction || "-"} - {detailTask?.periodLabel || "-"}
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
                    variant="outline"
                    className={cn(
                      "mt-2 text-[10px] gap-1",
                      levelBadgeVariant[
                        detailTask.status === "done"
                          ? "Selesai"
                          : detailTask.status === "overdue"
                            ? "Overdue"
                            : "Pending"
                      ],
                    )}
                  >
                    {detailTask.status === "done" ? (
                      <CheckCircle2 className="size-3" />
                    ) : detailTask.status === "overdue" ? (
                      <AlertTriangle className="size-3" />
                    ) : (
                      <Clock className="size-3" />
                    )}
                    {detailTask.status === "done"
                      ? "Selesai"
                      : detailTask.status === "overdue"
                        ? "Overdue"
                        : "Pending"}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Periode
                  </p>
                  <p className="mt-2 text-sm font-medium">{detailTask.periodLabel || "-"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tenggat
                  </p>
                  <p className="mt-2 text-sm font-medium">{formatDate(detailTask.dueDate)}</p>
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Progress
                    </p>
                    <p className="text-lg font-bold">
                      {detailTask.status === "done"
                        ? `${detailTask.progressPct}%`
                        : "Belum dilaporkan"}
                    </p>
                  </div>
                  <Progress
                    value={detailTask.status === "done" ? detailTask.progressPct : 0}
                    className="h-2 flex-1 max-w-xs"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Biaya Aktual
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {detailTask.actualCost
                        ? `Rp ${detailTask.actualCost.toLocaleString("id-ID")}`
                        : "-"}
                    </p>
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
              (detailTask.status === "pending" || detailTask.status === "overdue") && (
                <Button
                  size="sm"
                  variant={detailTask.status === "overdue" ? "destructive" : "default"}
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Lapor Progress Penanganan</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTask?.mitigationAction} — {selectedTask?.periodLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Persentase Penyelesaian</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressPct}
                  onChange={(e) => setProgressPct(e.target.value)}
                  className="w-24 text-xs"
                  placeholder="0"
                  aria-invalid={Boolean(showValidationErrors && formErrors.progressPct)}
                  aria-describedby={showValidationErrors && formErrors.progressPct ? "monitoring-progress-error" : undefined}
                />
                <span className="text-xs text-muted-foreground">%</span>
                <Progress value={Number(progressPct || 0)} className="h-2 flex-1" />
              </div>
              {showValidationErrors && formErrors.progressPct && (
                <p id="monitoring-progress-error" className="text-[11px] text-destructive">
                  {formErrors.progressPct}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Biaya Aktual (Rp)<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="text-xs"
                placeholder="0"
                aria-invalid={Boolean(showValidationErrors && formErrors.actualCost)}
                aria-describedby={showValidationErrors && formErrors.actualCost ? "monitoring-cost-error" : undefined}
              />
              {showValidationErrors && formErrors.actualCost && (
                <p id="monitoring-cost-error" className="text-[11px] text-destructive">
                  {formErrors.actualCost}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Link Bukti / Evidence<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="text-xs"
                placeholder="https://drive.google.com/..."
                aria-invalid={Boolean(showValidationErrors && formErrors.evidenceUrl)}
                aria-describedby={showValidationErrors && formErrors.evidenceUrl ? "monitoring-evidence-error" : undefined}
              />
              {showValidationErrors && formErrors.evidenceUrl && (
                <p id="monitoring-evidence-error" className="text-[11px] text-destructive">
                  {formErrors.evidenceUrl}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Catatan Pelaksanaan<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-xs"
                placeholder="Jelaskan pencapaian atau kendala yang dihadapi..."
                aria-invalid={Boolean(showValidationErrors && formErrors.notes)}
                aria-describedby={showValidationErrors && formErrors.notes ? "monitoring-notes-error" : undefined}
              />
              {showValidationErrors && formErrors.notes && (
                <p id="monitoring-notes-error" className="text-[11px] text-destructive">
                  {formErrors.notes}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)} className="text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleSubmitProgress} disabled={submitting || hasFormErrors} className="gap-2 text-xs">
              {submitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              Kirim Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
