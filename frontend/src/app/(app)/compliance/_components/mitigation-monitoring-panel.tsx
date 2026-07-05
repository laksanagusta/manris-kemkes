"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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
  Search,
  Send,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { validateMitigationReportForm } from "@/lib/validation/reporting";
import { getMitigationSubmissionActionState } from "@/lib/kri-reporting";
import {
  getLinearStatusBadgeClass,
  getLinearToneBadgeClass,
} from "@/lib/linear-status-badge";
import {
  buildMitigationMonitoringQueryString,
  parseMitigationMonitoringQueryState,
} from "@/lib/mitigation-monitoring-query";
import type { MitigationTask } from "@/types/risk";

const levelBadgeVariant: Record<string, string> = {
  Pending: getLinearStatusBadgeClass("pending"),
  Overdue: getLinearStatusBadgeClass("overdue"),
  Selesai: getLinearStatusBadgeClass("completed"),
};

const tierConfig: Record<string, { label: string; color: string }> = {
  upcoming: { label: "Akan Datang", color: "text-muted-foreground" },
  reminder: { label: "Reminder", color: "text-violet-700" },
  light: { label: "Overdue Ringan", color: "text-amber-700" },
  heavy: { label: "Overdue Berat", color: "text-rose-700" },
};

const doneBadgeClass = cn(
  "border-success/20 bg-success/10 text-success hover:bg-success/10",
);

type MitigationTaskRow = MitigationTask & {
  tier: keyof typeof tierConfig;
  level: keyof typeof levelBadgeVariant;
  unit: string;
  pic: string;
  daysOverdue: number;
  mitigationAction: string;
  title: string;
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(handle);
  }, [delay, value]);

  return debouncedValue;
}

export function MitigationMonitoringPanel() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsString = searchParams.toString();
  const queryState = useMemo(
    () =>
      parseMitigationMonitoringQueryState(
        new URLSearchParams(searchParamsString),
      ),
    [searchParamsString],
  );
  const { page, limit } = queryState;

  const [mitigations, setMitigations] = useState<MitigationTaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<MitigationTaskRow | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MitigationTaskRow | null>(
    null,
  );
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [search, setSearch] = useState(queryState.search);

  useEffect(() => {
    setSearch(queryState.search);
  }, [queryState.search]);

  const debouncedSearch = useDebouncedValue(search, 500);

  const formErrors = useMemo(
    () =>
      validateMitigationReportForm({
        evidenceUrl,
        notes,
      }),
    [evidenceUrl, notes],
  );
  const hasFormErrors = Object.keys(formErrors).length > 0;

  const pushQueryState = useCallback(
    (
      nextState: Partial<{
        search: string;
        page: number;
        limit: number;
      }>,
    ) => {
      const mergedState = {
        search: nextState.search ?? queryState.search,
        page: nextState.page ?? queryState.page,
        limit: nextState.limit ?? queryState.limit,
      };
      const query = buildMitigationMonitoringQueryString(mergedState);
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, queryState.limit, queryState.page, queryState.search, router],
  );

  useEffect(() => {
    const nextSearch = debouncedSearch.trim();
    if (nextSearch === queryState.search) {
      return;
    }

    pushQueryState({ search: nextSearch, page: 1 });
  }, [debouncedSearch, pushQueryState, queryState.search]);

  const fetchMitigations = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const query = buildMitigationMonitoringQueryString({
        search: queryState.search,
        page,
        limit,
      });
      const response = await api.get<{ data: MitigationTask[]; total: number }>(
        query ? `/mitigation-tasks/all?${query}` : "/mitigation-tasks/all",
        token,
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
          level:
            backendStatus === "done"
              ? "Selesai"
              : backendStatus === "overdue"
                ? "Overdue"
                : "Pending",
          tier,
          mitigationAction: m.mitigationAction || "—",
          status: backendStatus,
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
            const aReported = a.reportedAt
              ? new Date(a.reportedAt).getTime()
              : 0;
            const bReported = b.reportedAt
              ? new Date(b.reportedAt).getTime()
              : 0;
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
  }, [token, page, limit, queryState.search]);

  useEffect(() => {
    fetchMitigations();
  }, [fetchMitigations]);

  const handleOpenSubmit = (task: MitigationTaskRow) => {
    setSelectedTask(task);
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
    pushQueryState({ page: newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    pushQueryState({ limit: newLimit, page: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Penanganan"
          value={mitigations.length}
          tone="white"
          className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border border-0 p-4"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          tone="rose"
          className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border border-0 p-4"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
        <KpiCard
          label="Akan Datang"
          value={upcomingCount}
          tone="zinc"
          className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border border-0 p-4"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
        <KpiCard
          label="Selesai"
          value={completedCount}
          tone="emerald"
          className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border border-0 p-4"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
      </div>

      <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-border bg-card p-4 shadow-none">
        <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
              Daftar mitigasi
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
              Tinjau rencana penanganan yang mendekati tenggat, lalu buka
              detail atau kirim progress langsung dari daftar ini.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 sm:w-64 md:flex-none">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <SearchInput
                  placeholder="Cari mitigasi..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Cari mitigasi"
                  className="bg-muted pl-10 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-left">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat data mitigasi...
              </div>
            </div>
          </div>
        ) : mitigations.length === 0 ? (
          <div className="p-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-left">
              <p className="text-sm font-medium text-foreground">
                Belum ada rencana mitigasi yang sesuai filter
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ubah filter pencarian atau periode untuk melihat data lain.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="-mx-4 overflow-x-auto">
              <Table className="min-w-[980px] table-fixed">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[28%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[23%]" />
                </colgroup>
                <TableHeader className="[&_tr]:border-b [&_tr]:border-border">
                  <TableRow className="h-9 hover:bg-transparent">
                    <TableHead className="whitespace-nowrap pl-4 pr-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Kode
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Rencana Penanganan
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Unit / PIC
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Jatuh Tempo
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-3 text-left align-middle text-xs font-medium capitalize text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="whitespace-nowrap pl-3 pr-4 text-right align-middle text-xs font-medium capitalize text-muted-foreground">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mitigations.map((item) => {
                    const tier = tierConfig[item.tier];
                    const submissionState =
                      getMitigationSubmissionActionState(
                        item.periodEnd,
                        item.dueDate,
                      );

                    return (
                      <TableRow
                        key={item.id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <TableCell className="py-2 pl-4 pr-3 text-foreground">
                          {item.riskCode}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="block min-w-0 truncate text-left text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                          >
                            {item.mitigationAction}
                          </button>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="space-y-0.5">
                            <p className="truncate text-sm text-foreground">
                              {item.unit}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {item.pic}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground">
                          {item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString(
                                "id-ID",
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            className={
                              item.status === "done"
                                ? doneBadgeClass
                                : levelBadgeVariant[item.level] ||
                                  getLinearToneBadgeClass("neutral")
                            }
                          >
                            {item.status === "done" ? "Selesai" : item.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 pl-3 pr-4 text-right">
                          {item.status === "done" ? (
                            <span className="text-sm text-success">
                              Selesai
                            </span>
                          ) : !submissionState.allowed ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block cursor-not-allowed">
                                    <Button
                                      size="sm"
                                      variant={
                                        submissionState.isOverdue
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
                                <TooltipContent
                                  side="left"
                                  className="max-w-[220px] text-xs"
                                >
                                  {submissionState.message}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Button
                              size="sm"
                              variant={
                                submissionState.isOverdue
                                  ? "destructive"
                                  : "default"
                              }
                              style={submissionState.isOverdue ? undefined : { '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties}
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

            <div className="-mx-4 -mb-4 flex items-center justify-between border-t border-border/50 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Baris per halaman:
                  </span>
                  <Select
                    value={limit.toString()}
                    onValueChange={(val) => {
                      handleLimitChange(Number.parseInt(val, 10));
                    }}
                  >
                    <SelectTrigger className="h-7 w-[65px] border-border bg-card text-xs text-muted-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((pageSize) => (
                        <SelectItem
                          key={pageSize}
                          value={pageSize.toString()}
                        >
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                  {Math.min(page * limit, total)} dari {total} mitigasi
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <span className="px-2 text-xs text-muted-foreground">
                  dari {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={page === totalPages || total === 0 || loading}
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, page + 1))
                  }
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

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
                <div className="rounded-xl ring-1 ring-inset ring-border bg-card p-3 shadow-none">
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
                <div className="rounded-xl ring-1 ring-inset ring-border bg-card p-3 shadow-none">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Periode
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {detailTask.periodLabel || "-"}
                  </p>
                </div>
                <div className="rounded-xl ring-1 ring-inset ring-border bg-card p-3 shadow-none">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tenggat
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {formatDate(detailTask.dueDate)}
                  </p>
                </div>
                <div className="rounded-lg ring-1 ring-inset ring-border bg-muted/20 p-3">
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

              <div className="rounded-xl ring-1 ring-inset ring-border bg-card p-4 space-y-3 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <p className="text-lg font-bold">
                      {detailTask.status === "done"
                        ? "Selesai"
                        : "Belum dilaporkan"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl ring-1 ring-inset ring-border bg-card p-3 shadow-none">
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
                <div className="rounded-xl ring-1 ring-inset ring-border bg-card p-3 shadow-none">
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Lapor Progress Penanganan
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTask?.mitigationAction} - {selectedTask?.periodLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Link Bukti / Evidence
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
                    ? "monitoring-evidence-error"
                    : undefined
                }
              />
              {showValidationErrors && formErrors.evidenceUrl && (
                <p
                  id="monitoring-evidence-error"
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
                className="min-h-[80px] text-xs"
                placeholder="Jelaskan pencapaian atau kendala yang dihadapi..."
                aria-invalid={Boolean(showValidationErrors && formErrors.notes)}
                aria-describedby={
                  showValidationErrors && formErrors.notes
                    ? "monitoring-notes-error"
                    : undefined
                }
              />
              {showValidationErrors && formErrors.notes && (
                <p
                  id="monitoring-notes-error"
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
    </div>
  );
}
