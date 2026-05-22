"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KpiCard } from "@/components/ui/kpi-card";
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
import {
  getLinearStatusBadgeClass,
  getLinearToneBadgeClass,
} from "@/lib/linear-status-badge";
import type { MitigationTask } from "@/types/risk";

const levelBadgeVariant: Record<string, string> = {
  Pending: getLinearStatusBadgeClass("pending"),
  Overdue: getLinearStatusBadgeClass("overdue"),
  Selesai: getLinearStatusBadgeClass("completed"),
};

const tierConfig: Record<string, { label: string; color: string }> = {
  upcoming: { label: "Akan Datang", color: "text-zinc-700" },
  reminder: { label: "Reminder", color: "text-violet-700" },
  light: { label: "Overdue Ringan", color: "text-amber-700" },
  heavy: { label: "Overdue Berat", color: "text-rose-700" },
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

  const handleOpenSubmit = (task: MitigationTaskRow) => {
    setSelectedTask(task);
    setProgressPct(task.progressPct ? String(task.progressPct) : "");
    setActualCost(task.actualCost ? String(task.actualCost) : "");
    setEvidenceUrl(task.evidenceUrl || "");
    setNotes(task.notes || "");
    setShowValidationErrors(false);
    setShowDialog(true);
  };

  const handleOpenDetail = (task: MitigationTaskRow) => {
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
  const upcomingCount = activeMitigations.filter(
    (m) => m.tier === "upcoming",
  ).length;
  const overdueCount = heavyCount + lightCount;

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

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Penanganan"
          value={mitigations.length}
          tone="white"
          icon={<ShieldAlert className="size-5 text-muted-foreground" />}
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          tone="rose"
          description="Gabungan overdue ringan dan berat"
          icon={<AlertTriangle className="size-5 text-risk-extreme" />}
        />
        <KpiCard
          label="Akan Datang"
          value={upcomingCount}
          tone="zinc"
          description="Lebih dari 7 hari"
          icon={<Bell className="size-5 text-muted-foreground" />}
        />
        <KpiCard
          label="Selesai"
          value={completedCount}
          tone="emerald"
          description="Laporan masuk"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)] ring-1 ring-inset ring-zinc-200/80">
        <div className="flex flex-col gap-3 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:flex-row md:items-start md:justify-between md:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
                Daftar mitigasi
              </h2>
              <p className="mt-1 text-xs text-zinc-500 text-pretty">
                Tinjau rencana penanganan yang mendekati tenggat, lalu buka detail atau kirim progress langsung dari daftar ini.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 tabular-nums ring-1 ring-inset ring-zinc-200">
              {mitigations.length} mitigasi
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {loading ? (
            <div className="p-4">
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-8 text-left">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <Loader2 className="size-4 animate-spin" />
                  Memuat data mitigasi...
                </div>
              </div>
            </div>
          ) : mitigations.length === 0 ? (
            <div className="p-4">
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-8 text-left">
                <p className="text-sm font-medium text-zinc-700">
                  Tidak ada rencana mitigasi yang overdue
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Semua rencana mitigasi telah ditangani atau belum mendekati tenggat
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-3 p-4 md:hidden">
                {mitigations.map((item) => {
                  const tier = tierConfig[item.tier];
                  const submissionCheck = isWithinMitigationSubmissionWindow(
                    item.periodEnd,
                    item.dueDate,
                  );

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm",
                        item.tier === "heavy" && "bg-rose-50/30",
                      )}
                      onClick={() => handleOpenDetail(item)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900">
                              {item.riskCode}
                            </span>
                            <Badge className={levelBadgeVariant[item.level] || getLinearToneBadgeClass("neutral")}>
                              {item.level}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors hover:text-primary">
                            {item.mitigationAction}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {item.unit} • {item.pic}
                          </p>
                        </div>
                        <Badge className={cn(
                          item.tier === "upcoming"
                            ? getLinearToneBadgeClass("neutral")
                            : item.tier === "reminder"
                              ? getLinearToneBadgeClass("progress")
                              : item.tier === "light"
                                ? getLinearToneBadgeClass("warning")
                                : getLinearToneBadgeClass("danger"),
                        )}>
                          {tier.label}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1 rounded-xl bg-zinc-50/80 px-3 py-2 ring-1 ring-inset ring-zinc-200/80">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                            Jatuh Tempo
                          </p>
                          <div className="text-sm text-zinc-900">
                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString("id-ID") : "—"}
                          </div>
                        </div>
                        <div className="space-y-1 rounded-xl bg-zinc-50/80 px-3 py-2 ring-1 ring-inset ring-zinc-200/80">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                            Hari
                          </p>
                          <div className={cn(
                            "text-sm font-semibold",
                            item.daysOverdue > 0 ? tier.color : "text-zinc-900",
                          )}>
                            {item.daysOverdue > 0 ? `+${item.daysOverdue}` : item.daysOverdue}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <div className="space-y-1 rounded-xl bg-zinc-50/80 px-3 py-2 ring-1 ring-inset ring-zinc-200/80">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                            Status
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className={levelBadgeVariant[item.level] || getLinearToneBadgeClass("neutral")}>
                              {item.level}
                            </Badge>
                            <span className="text-xs text-zinc-500">
                              {item.status === "done"
                                ? "Selesai"
                                : item.status === "overdue"
                                  ? "Terlambat"
                                  : "Menunggu"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-zinc-500">
                          {submissionCheck.allowed
                            ? "Siap lapor progres"
                            : submissionCheck.message}
                        </div>
                        <Button
                          size="sm"
                          variant={item.status === "overdue" ? "destructive" : "default"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenSubmit(item);
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <Send className="size-3" /> Lapor
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative w-full overflow-x-auto">
                <Table className="min-w-[1180px]">
                  <TableHeader className="[&_tr]:border-b [&_tr]:border-zinc-200">
                    <TableRow className="border-zinc-200 transition-colors hover:bg-transparent">
                      <TableHead className="w-20 whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
                        Kode
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Rencana Penanganan
                      </TableHead>
                      <TableHead className="w-36 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Unit / PIC
                      </TableHead>
                      <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Jatuh Tempo
                      </TableHead>
                      <TableHead className="w-20 whitespace-nowrap px-2.5 text-center align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Hari
                      </TableHead>
                      <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Status
                      </TableHead>
                      <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Eskalasi
                      </TableHead>
                      <TableHead className="w-32 whitespace-nowrap px-2.5 text-right align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {mitigations.map((item) => {
                    const tier = tierConfig[item.tier];
                    const submissionCheck = isWithinMitigationSubmissionWindow(
                      item.periodEnd,
                      item.dueDate,
                    );

                    return (
                      <TableRow
                        key={item.id}
                        className="border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
                        onClick={() => handleOpenDetail(item)}
                      >
                        <TableCell className="font-mono text-zinc-600 pl-4 pr-2 py-2 md:pl-6">
                          {item.riskCode}
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <p className="block truncate text-sm font-semibold leading-relaxed text-zinc-900 transition-colors hover:text-primary">
                            {item.mitigationAction}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="truncate text-sm text-zinc-900">
                              {item.unit}
                            </p>
                            <p className="truncate text-[10px] text-zinc-500">
                              {item.pic}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString("id-ID")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "text-sm font-medium tabular-nums",
                              item.daysOverdue > 0
                                ? tier.color
                                : "text-zinc-900",
                            )}
                          >
                            {item.daysOverdue > 0
                              ? `+${item.daysOverdue}`
                              : item.daysOverdue}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              levelBadgeVariant[item.level] ||
                              getLinearToneBadgeClass("neutral")
                            }
                          >
                            {item.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              item.tier === "upcoming"
                                ? getLinearToneBadgeClass("neutral")
                                : item.tier === "reminder"
                                  ? getLinearToneBadgeClass("progress")
                                  : item.tier === "light"
                                    ? getLinearToneBadgeClass("warning")
                                    : getLinearToneBadgeClass("danger"),
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
                                      variant={
                                        item.status === "overdue"
                                          ? "destructive"
                                          : "default"
                                      }
                                      disabled
                                      className="pointer-events-none text-sm opacity-50"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
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
                          ) : (
                            <Button
                              size="sm"
                              variant={
                                item.status === "overdue"
                                  ? "destructive"
                                  : "default"
                              }
                              className="gap-1.5 text-xs h-8 shrink-0"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenSubmit(item);
                              }}
                            >
                              <Send className="size-3" /> Lapor
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Baris per halaman:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("limit", val);
                    params.set("page", "1");
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                  }}
                >
                  <SelectTrigger className="h-7 w-[65px] border-zinc-200 bg-white text-xs text-zinc-700">
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
              <p className="text-xs text-zinc-500">
                Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} mitigasi
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
              <span className="px-2 text-xs text-zinc-500">
                dari {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                disabled={page === totalPages || total === 0 || loading}
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>

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
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
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
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Periode
                  </p>
                  <p className="mt-2 text-sm font-medium">{detailTask.periodLabel || "-"}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
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

              <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
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
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Biaya Aktual
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {detailTask.actualCost
                        ? `Rp ${detailTask.actualCost.toLocaleString("id-ID")}`
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
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
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)]">
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
