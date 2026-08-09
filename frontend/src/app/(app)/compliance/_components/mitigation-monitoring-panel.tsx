"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import {
  CollectionDialogCancel,
  CollectionEmptyState,
  CollectionLoadingState,
  CollectionPagination,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  ExpandableSearchField,
} from "@/components/shared/design-system";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
  CheckCircle2,
  Loader2,
  Send,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  ActionButton,
  AccentButton,
  MitigationProgressDialog,
} from "@/components/shared/design-system";
import { validateMitigationReportForm } from "@/lib/validation/reporting";
import { getMitigationSubmissionActionState } from "@/lib/kri-reporting";
import {
  buildMitigationMonitoringQueryString,
  parseMitigationMonitoringQueryState,
} from "@/lib/mitigation-monitoring-query";
import type { MitigationTask } from "@/types/risk";

const tierConfig: Record<string, { label: string; color: string }> = {
  upcoming: { label: "Akan Datang", color: "text-muted-foreground" },
  reminder: { label: "Reminder", color: "text-violet-700" },
  light: { label: "Overdue Ringan", color: "text-amber-700" },
  heavy: { label: "Overdue Berat", color: "text-rose-700" },
};

type MitigationTaskRow = MitigationTask & {
  tier: keyof typeof tierConfig;
  unit: string;
  daysOverdue: number;
  mitigationAction: string;
  title: string;
};

function getMitigationStatusTone(status: MitigationTaskRow["status"]) {
  if (status === "done") return "success";
  if (status === "overdue") return "danger";
  return "progress";
}

function getMitigationStatusLabel(status: MitigationTaskRow["status"]) {
  if (status === "done") return "Selesai";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

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
          daysOverdue,
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
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Penanganan"
          value={mitigations.length}
          tone="white"
          className="flex min-h-[96px] flex-col rounded-lg border-0 p-4 ring-1 ring-inset ring-border"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          tone="rose"
          className="flex min-h-[96px] flex-col rounded-lg border-0 p-4 ring-1 ring-inset ring-border"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
        <KpiCard
          label="Akan Datang"
          value={upcomingCount}
          tone="zinc"
          className="flex min-h-[96px] flex-col rounded-lg border-0 p-4 ring-1 ring-inset ring-border"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
        <KpiCard
          label="Selesai"
          value={completedCount}
          tone="emerald"
          className="flex min-h-[96px] flex-col rounded-lg border-0 p-4 ring-1 ring-inset ring-border"
          labelClassName="capitalize tracking-normal"
          valueClassName="font-medium"
          valueWrapClassName="mt-auto"
        />
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto md:ml-auto">
          <ExpandableSearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari mitigasi..."
            ariaLabel="Cari mitigasi"
          />
      </div>

      {loading ? (
        <CollectionLoadingState message="Memuat data mitigasi..." />
      ) : mitigations.length === 0 ? (
        <CollectionEmptyState
          title="Belum ada rencana mitigasi yang sesuai filter"
          description="Ubah filter pencarian atau periode untuk melihat data lain."
        />
      ) : (
        <CollectionTableCard>
          <Table className="min-w-[980px] table-fixed">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[28%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[23%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow className="h-9 hover:bg-transparent">
                <CollectionTableHead className="pl-4 pr-3">
                  Kode
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Rencana Penanganan
                </CollectionTableHead>
                <CollectionTableHead className="px-3">Unit</CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Jatuh Tempo
                </CollectionTableHead>
                <CollectionTableHead className="px-3">Status</CollectionTableHead>
                <CollectionTableHead className="pl-3 pr-4 text-right">
                  Aksi
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
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
                    className="group border-0 hover:bg-transparent"
                  >
                    <TableCell className="py-2 pl-4 pr-3 align-top text-sm text-foreground">
                      <span className="font-mono text-xs font-medium tracking-wide text-muted-foreground">
                        {item.riskCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="block min-w-0 text-left text-sm font-normal leading-5 text-foreground transition-colors hover:text-primary"
                      >
                        <span className="line-clamp-2">
                          {item.mitigationAction}
                        </span>
                      </button>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        Risiko: {item.title}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-top">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.unit}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-top text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <p>
                          {item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString(
                                "id-ID",
                              )
                            : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          {tier.label}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-top">
                      <Badge
                        size="compact"
                        tone={getMitigationStatusTone(item.status)}
                      >
                        {getMitigationStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 pl-3 pr-4 text-right">
                      {item.status === "done" ? null : !submissionState.allowed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block cursor-not-allowed">
                                <ActionButton
                                  size="sm"
                                  variant={
                                    submissionState.isOverdue
                                      ? "destructive"
                                      : "default"
                                  }
                                  disabled
                                  className="pointer-events-none text-xs opacity-50"
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                  icon={<Send className="size-3" />}
                                >
                                  Lapor
                                </ActionButton>
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
                      ) : submissionState.isOverdue ? (
                        <ActionButton
                          size="sm"
                          variant="destructive"
                          className="h-8 shrink-0 gap-1.5 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenSubmit(item);
                          }}
                          icon={<Send className="size-3" />}
                        >
                          Lapor
                        </ActionButton>
                      ) : (
                        <AccentButton
                          size="sm"
                          className="h-8 shrink-0 gap-1.5 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenSubmit(item);
                          }}
                          icon={<Send className="size-3" />}
                        >
                          Lapor
                        </AccentButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <CollectionPagination
            itemLabel="mitigasi"
            page={page}
            pageSize={limit}
            total={total}
            disabled={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={(nextLimit) => {
              handleLimitChange(nextLimit);
            }}
          />
        </CollectionTableCard>
      )}

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="items-start gap-0 px-4 py-6 text-left">
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
                    size="compact"
                    tone={getMitigationStatusTone(detailTask.status)}
                  >
                    {detailTask.status === "done" ? (
                      <CheckCircle2 className="size-3" />
                    ) : detailTask.status === "overdue" ? (
                      <AlertTriangle className="size-3" />
                    ) : (
                      <Clock className="size-3" />
                    )}
                    {getMitigationStatusLabel(detailTask.status)}
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
                detailTask.status === "overdue" ? (
                  <ActionButton
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setShowDetailDialog(false);
                      handleOpenSubmit(detailTask);
                    }}
                    icon={<Send className="size-3" />}
                  >
                    Lapor Progress
                  </ActionButton>
                ) : (
                  <AccentButton
                    size="sm"
                    onClick={() => {
                      setShowDetailDialog(false);
                      handleOpenSubmit(detailTask);
                    }}
                    icon={<Send className="size-3" />}
                  >
                    Lapor Progress
                  </AccentButton>
                )
              )}
            <CollectionDialogCancel
              size="sm"
              onClick={() => setShowDetailDialog(false)}
            >
              Tutup
            </CollectionDialogCancel>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MitigationProgressDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Lapor Progress Penanganan"
        description={
          selectedTask
            ? `${selectedTask.mitigationAction} - ${selectedTask.periodLabel}`
            : undefined
        }
        evidenceUrl={evidenceUrl}
        onEvidenceUrlChange={setEvidenceUrl}
        notes={notes}
        onNotesChange={setNotes}
        showValidationErrors={showValidationErrors}
        evidenceError={formErrors.evidenceUrl}
        notesError={formErrors.notes}
        footerActions={
          <AccentButton
            size="sm"
            onClick={handleSubmitProgress}
            disabled={submitting || hasFormErrors}
            className="gap-2 text-xs"
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
        evidenceId="monitoring-evidence-url"
        notesId="monitoring-notes"
      />
    </div>
  );
}
