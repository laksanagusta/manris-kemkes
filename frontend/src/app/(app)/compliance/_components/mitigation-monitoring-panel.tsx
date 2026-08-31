"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  KpiCard,
  MetricGrid,
} from "@/components/shared/design-system";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  Loader2,
  Link2,
  MessageSquare,
  Send,
  Target,
  ExternalLink,
  UserRound,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  AccentButton,
  MitigationProgressDialog,
} from "@/components/shared/design-system";
import { validateMitigationReportForm } from "@/lib/validation/reporting";
import { getMitigationSubmissionActionState } from "@/lib/mitigation-reporting";
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
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingReportTaskRef = useRef<MitigationTaskRow | null>(null);
  const reducedMotion = useReducedMotion();
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

  const handleOpenSubmit = useCallback((task: MitigationTaskRow) => {
    setSelectedTask(task);
    setEvidenceUrl(task.evidenceUrl || "");
    setNotes(task.notes || "");
    setShowValidationErrors(false);
    setShowDialog(true);
  }, []);

  const flushPendingReport = useCallback(() => {
    const task = pendingReportTaskRef.current;
    if (!task) return;

    pendingReportTaskRef.current = null;
    handleOpenSubmit(task);
  }, [handleOpenSubmit]);

  const handleOpenSubmitFromDetail = useCallback(
    (task: MitigationTaskRow) => {
      pendingReportTaskRef.current = task;
      setShowDetailDialog(false);

      if (reducedMotion) {
        window.requestAnimationFrame(flushPendingReport);
      }
    },
    [flushPendingReport, reducedMotion],
  );

  useEffect(() => {
    return () => {
      pendingReportTaskRef.current = null;
    };
  }, []);

  const handleOpenDetail = (task: MitigationTaskRow) => {
    setDetailTask(task);
    setShowDetailDialog(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask || !token) return;
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

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  };

  const handlePageChange = (newPage: number) => {
    pushQueryState({ page: newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    pushQueryState({ limit: newLimit, page: 1 });
  };

  return (
    <div className="space-y-4">
      <MetricGrid>
        <KpiCard
          label="Total Penanganan"
          value={mitigations.length}
          tone="white"
        />
        <KpiCard
          label="Overdue"
          value={overdueCount}
          tone="white"
        />
        <KpiCard
          label="Akan Datang"
          value={upcomingCount}
          tone="white"
        />
        <KpiCard
          label="Selesai"
          value={completedCount}
          tone="white"
        />
      </MetricGrid>

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
              <col className="w-[44%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow className="h-9 hover:bg-transparent">
                <CollectionTableHead className="px-3">
                  Rencana Penanganan
                </CollectionTableHead>
                <CollectionTableHead className="px-3">PIC</CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Deadline
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
                    <TableCell className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="block min-w-0 text-left text-sm font-semibold leading-5 text-foreground transition-colors hover:text-primary"
                      >
                        <span className="line-clamp-2 font-semibold">
                          {item.mitigationAction}
                        </span>
                      </button>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {item.riskCode} · {item.title}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-middle">
                      <p className="truncate text-sm font-medium text-muted-foreground">
                        {item.unit}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-middle text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <p>
                          {formatDate(item.dueDate)}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          {tier.label}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 align-middle">
                      <Badge
                        size="compact"
                        tone={getMitigationStatusTone(item.status)}
                      >
                        {getMitigationStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 pl-3 pr-4 text-right align-middle">
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
        <DialogContent
          className="max-w-2xl no-scrollbar"
          showCloseButton={false}
          onAnimationEnd={(event) => {
            if (
              event.currentTarget !== event.target ||
              event.animationName !== "exit"
            ) {
              return;
            }

            flushPendingReport();
          }}
        >
          <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
            <DialogTitle className="text-base">Detail Laporan Penanganan</DialogTitle>
          </DialogHeader>

          {detailTask && (
            <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Tindakan Penanganan
                  </p>
                  <div className="flex min-w-0 items-start gap-2 text-sm font-medium leading-6">
                    <Target
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                    <span>{detailTask.mitigationAction || "-"}</span>
                  </div>
                </div>

                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          detailTask.status === "done"
                            ? "bg-success"
                            : detailTask.status === "overdue"
                              ? "bg-destructive"
                              : "bg-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      {getMitigationStatusLabel(detailTask.status)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Periode</p>
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <CalendarDays
                        className="size-5 shrink-0 text-muted-foreground"
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">
                        {detailTask.periodLabel || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Tenggat</p>
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <CalendarClock
                        className="size-5 shrink-0 text-muted-foreground"
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                      <span>{formatDate(detailTask.dueDate)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      Laporan Oleh
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                      <UserRound
                        className="size-5 shrink-0 text-muted-foreground"
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">
                        {detailTask.reportedByName ||
                          detailTask.reportedBy ||
                          "Belum dilaporkan"}
                      </span>
                      {detailTask.reportedAt ? (
                        <span className="text-muted-foreground">
                          {formatDate(detailTask.reportedAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Link Bukti / Evidence
                  </p>
                  <div className="flex min-w-0 items-start gap-2 text-sm font-medium">
                    {detailTask.evidenceUrl ? (
                      <a
                        href={detailTask.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full min-w-0 items-start gap-2 text-foreground hover:text-primary"
                        onClick={(event) => event.stopPropagation()}
                        title={detailTask.evidenceUrl}
                      >
                        <Link2
                          className="size-5 shrink-0 text-muted-foreground"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-all">
                          {detailTask.evidenceUrl}
                        </span>
                        <ExternalLink
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </a>
                    ) : (
                      <>
                        <Link2
                          className="size-5 shrink-0 text-muted-foreground"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                        <span className="text-muted-foreground">-</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Catatan Pelaksanaan
                  </p>
                  <div className="flex min-w-0 items-start gap-2 text-sm leading-6 text-foreground">
                    <MessageSquare
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                    <p className="min-w-0 whitespace-pre-wrap">
                      {detailTask.notes || "Belum ada catatan pelaksanaan."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
              onClick={() => setShowDetailDialog(false)}
            >
              Tutup
            </CollectionDialogCancel>
            {detailTask &&
              (detailTask.status === "pending" ||
                detailTask.status === "overdue") && (
                detailTask.status === "overdue" ? (
                  <ActionButton
                    variant="destructive"
                    onClick={() => handleOpenSubmitFromDetail(detailTask)}
                    icon={<Send className="size-3" />}
                  >
                    Lapor Progress
                  </ActionButton>
                ) : (
                  <AccentButton
                    onClick={() => handleOpenSubmitFromDetail(detailTask)}
                    icon={<Send className="size-3" />}
                  >
                    Lapor Progress
                  </AccentButton>
                )
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        footerActions={
          <AccentButton
            onClick={handleSubmitProgress}
            disabled={submitting}
            aria-busy={submitting}
            icon={
              submitting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )
            }
          >
            {submitting ? "Mengirim..." : "Kirim Laporan"}
          </AccentButton>
        }
        evidenceId="monitoring-evidence-url"
        notesId="monitoring-notes"
      />
    </div>
  );
}
