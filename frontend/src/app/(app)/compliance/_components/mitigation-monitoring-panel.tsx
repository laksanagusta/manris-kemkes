"use client";

import { createDisplayDateFormatter } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { MitigationTaskTable } from "@/components/shared/mitigation-task-table";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CollectionEmptyState,
  CollectionLoadingState,
  CollectionPagination,
  CollectionSearchField,
  CollectionTableCard,
  CollectionToolbar,
  KpiCard,
  MetricGrid,
  DynamicTableFilters,
} from "@/components/shared/design-system";

import { toast } from "sonner";
import { parseEvidenceUrls } from "@/lib/validation/reporting";
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
  Upload,
} from "@/components/shared/icons";
import { api, ApiError } from "@/lib/api";
import { updateTaskReport } from "@/lib/api/mitigation-tasks";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  AccentButton,
  MitigationProgressFlowDialog,
  type MitigationProgressFlowView,
} from "@/components/shared/design-system";
import { validateMitigationReportForm } from "@/lib/validation/reporting";
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import { getAssessmentCycleFilterOptions } from "@/lib/risk-cycle-options";
import {
  buildMitigationMonitoringApiQueryString,
  buildMitigationMonitoringQueryString,
  parseMitigationMonitoringQueryState,
  mitigationMonitoringStatusOptions,
  type MitigationMonitoringStatusFilter,
} from "@/lib/mitigation-monitoring-query";
import { getMitigationReportLabel } from "@/lib/mitigation-report-status";
import type { MitigationTask } from "@/types/risk";

type MitigationTier = "upcoming" | "reminder" | "light" | "heavy";

type MitigationTaskRow = MitigationTask & {
  tier: MitigationTier;
  unit: string;
  daysOverdue: number;
  mitigationAction: string;
  title: string;
};

async function listMitigationTaskPeriods(token: string): Promise<string[]> {
  const pageSize = 100;
  const firstPage = await api.get<{
    data: MitigationTask[];
    total: number;
  }>(`/mitigation-tasks/all?page=1&limit=${pageSize}`, token);
  const periods = new Set(
    firstPage.data
      .map((task) => task.periodLabel.trim())
      .filter(Boolean),
  );
  const pageCount = Math.ceil(firstPage.total / pageSize);

  for (let startPage = 2; startPage <= pageCount; startPage += 5) {
    const pages = Array.from(
      { length: Math.min(5, pageCount - startPage + 1) },
      (_, index) => startPage + index,
    );
    const responses = await Promise.all(
      pages.map((page) =>
        api.get<{ data: MitigationTask[]; total: number }>(
          `/mitigation-tasks/all?page=${page}&limit=${pageSize}`,
          token,
        ),
      ),
    );

    for (const response of responses) {
      for (const task of response.data) {
        const period = task.periodLabel.trim();
        if (period) periods.add(period);
      }
    }
  }

  return [...periods];
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
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<MitigationTaskRow | null>(null);
  const [showMitigationDialog, setShowMitigationDialog] = useState(false);
  const [dialogView, setDialogView] = useState<MitigationProgressFlowView>(
    "detail",
  );
  const [selectedTask, setSelectedTask] = useState<MitigationTaskRow | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [openedFromWork, setOpenedFromWork] = useState(false);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailReportAction = detailTask ? getMitigationTaskReportAction(detailTask) : null;
  const detailStatus = detailReportAction?.isOverdue ? "overdue" : detailTask?.status;
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [search, setSearch] = useState(queryState.search);
  const [period, setPeriod] = useState(queryState.period ?? "");

  useEffect(() => {
    if (!token) {
      setAvailablePeriods([]);
      return;
    }

    setAvailablePeriods([]);
    let cancelled = false;
    listMitigationTaskPeriods(token)
      .then((periods) => {
        if (!cancelled) setAvailablePeriods(periods);
      })
      .catch((error) => {
        console.error("Failed to load mitigation task periods", error);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setSearch(queryState.search);
  }, [queryState.search]);

  useEffect(() => {
    setPeriod(queryState.period ?? "");
  }, [queryState.period]);

  const debouncedSearch = useDebouncedValue(search, 500);
  const debouncedPeriod = useDebouncedValue(period, 400);
  const periodFilterOptions = useMemo(
    () => getAssessmentCycleFilterOptions(new Date(), period, availablePeriods),
    [availablePeriods, period],
  );

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
        status: MitigationMonitoringStatusFilter;
        period: string;
        page: number;
        limit: number;
      }>,
    ) => {
      const mergedState = {
        search: nextState.search ?? queryState.search,
        status: nextState.status ?? queryState.status ?? "all",
        period: nextState.period ?? queryState.period ?? "",
        page: nextState.page ?? queryState.page,
        limit: nextState.limit ?? queryState.limit,
      };
      const query = buildMitigationMonitoringQueryString(mergedState);
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [
      pathname,
      queryState.limit,
      queryState.page,
      queryState.period,
      queryState.search,
      queryState.status,
      router,
    ],
  );

  useEffect(() => {
    const nextSearch = debouncedSearch.trim();
    const nextPeriod = debouncedPeriod.trim();
    if (
      nextSearch === queryState.search &&
      nextPeriod === (queryState.period ?? "")
    ) {
      return;
    }

    pushQueryState({ search: nextSearch, period: nextPeriod, page: 1 });
  }, [
    debouncedPeriod,
    debouncedSearch,
    pushQueryState,
    queryState.period,
    queryState.search,
  ]);

  const collectionSort = useRemoteCollectionSorting({"Rencana Penanganan":"action",PIC:"owner",Periode:"period",Deadline:"due_date",Status:"status"},()=>pushQueryState({page:1}));
  const loadGeneration=useRef(0);
  const fetchMitigations = useCallback(async () => {
    if (!token) return;

    const generation=++loadGeneration.current;
    setLoading(true);
    try {
      const query = buildMitigationMonitoringApiQueryString({
        search: queryState.search,
        status: queryState.status,
        period: queryState.period,
        page,
        limit,
      });
      const sortParams = new URLSearchParams(query);
      if(collectionSort.touched || queryState.status!=="needs_reporting") {
        sortParams.set("sort_by",collectionSort.sortBy);sortParams.set("sort_order",collectionSort.sortOrder);
      }
      const response = await api.get<{ data: MitigationTask[]; total: number }>(
        `/mitigation-tasks/all?${sortParams}`,
        token,
      );

      if(generation!==loadGeneration.current)return;
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

      setMitigations(processed);
    } catch (error) {
      console.error(error);
    } finally {
      if(generation===loadGeneration.current)setLoading(false);
    }
  }, [token, page, limit, queryState.search, queryState.status, queryState.period, collectionSort.sortBy,collectionSort.sortOrder,collectionSort.touched]);

  useEffect(() => {
    fetchMitigations();
  }, [fetchMitigations]);

  const openReportForm = useCallback((task: MitigationTaskRow, preserveInput = false) => {
    setDetailTask(task);
    if (!getMitigationTaskReportAction(task).allowed) {
      setDialogView("detail");
    } else {
      if (!preserveInput) {
        setSelectedTask(task);
        setEvidenceUrl(task.evidenceUrl || "");
        setNotes(task.notes || "");
        setShowValidationErrors(false);
        setSubmitError("");
      }
      setDialogView("form");
    }
    setReportSent(false);
    setShowMitigationDialog(true);
  }, []);

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!token || !taskId) return;
    let cancelled = false;
    api.get<MitigationTask>(`/mitigation-tasks/${encodeURIComponent(taskId)}`, token).then(task => {
      if (cancelled) return;
      const row: MitigationTaskRow = { ...task, riskCode: task.riskCode || "—", title: task.riskTitle || "—", unit: task.mitigationOwner || "—", daysOverdue: 0, tier: "upcoming", mitigationAction: task.mitigationAction || "—" };
      detailTriggerRef.current = null;
      setOpenedFromWork(searchParams.get("returnTo") === "/work");
      openReportForm(row);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("taskId");
      next.delete("returnTo");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }).catch(() => { if (!cancelled) toast.error("Laporan ini tidak dapat dibuka. Periksa akses dan coba lagi."); });
    return () => { cancelled = true; };
  }, [token, searchParams, router, pathname, openReportForm]);

  const handleOpenDetail = (task: MitigationTaskRow, trigger: HTMLButtonElement) => {
    detailTriggerRef.current = trigger;
    setOpenedFromWork(false);
    setReportSent(false);
    setDetailTask(task);
    setDialogView("detail");
    setShowMitigationDialog(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask || !token || submitting) return;
    setSubmitError("");
    const action = getMitigationTaskReportAction(selectedTask);
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
      const updated = await updateTaskReport(token, selectedTask.id, {
        status: "done",
        evidenceUrl,
        notes,
      });
      setDetailTask({ ...selectedTask, ...updated });
      setSelectedTask(null);
      setReportSent(true);
      setDialogView("detail");
      void fetchMitigations();
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.status < 500
        ? error.message
        : "Pengiriman belum terkonfirmasi. Isian tetap tersedia. Coba kirim lagi.");
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
  const hasActiveFilters =
    Boolean(queryState.search || queryState.period) ||
    (queryState.status ?? "all") !== "all";

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return createDisplayDateFormatter("id-ID", {
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
    <div className="space-y-6">
      <MetricGrid>
        <KpiCard
          label="Total Penanganan"
          value={total}
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
          label="Sudah dilaporkan"
          value={completedCount}
          tone="white"
        />
      </MetricGrid>

      <div className="space-y-4">
        <CollectionToolbar
          leading={
            <DynamicTableFilters
              search={
                <CollectionSearchField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari mitigasi..."
                  aria-label="Cari mitigasi"
                />
              }
              fields={[
                {
                  id: "status",
                  label: "Status",
                  value: queryState.status ?? "all",
                  onChange: (value) => pushQueryState({
                    status: value as MitigationMonitoringStatusFilter,
                    page: 1,
                  }),
                  options: mitigationMonitoringStatusOptions,
                },
                {
                  id: "period",
                  label: "Periode",
                  value: period || "all",
                  onChange: (value) => setPeriod(value === "all" ? "" : value),
                  options: periodFilterOptions,
                },
              ]}
            />
          }
          actions={
            <ActionButton asChild variant="outline">
              <Link href="/compliance/penanganan/impor">
                <Upload className="size-3.5" />
                Import
              </Link>
            </ActionButton>
          }
        />
        <CollectionTableCard
          stickyActions
          sorting={
            !collectionSort.touched && queryState.status === "needs_reporting"
              ? { ...collectionSort.controls, key: "Deadline", direction: "asc" }
              : collectionSort.controls
          }
        >
          {loading ? (
            <CollectionLoadingState message="Memuat data mitigasi..." />
          ) : mitigations.length === 0 ? (
            <CollectionEmptyState
              title={
                hasActiveFilters
                  ? "Tidak ada penanganan sesuai filter"
                  : "Belum ada rencana penanganan"
              }
              description={
                hasActiveFilters
                  ? "Ubah kata kunci, status, atau periode untuk melihat data lain."
                  : "Rencana penanganan akan muncul di sini setelah tersedia."
              }
              action={
                hasActiveFilters ? (
                  <ActionButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setPeriod("");
                      pushQueryState({
                        search: "",
                        status: "all",
                        period: "",
                        page: 1,
                      });
                    }}
                  >
                    Reset filter
                  </ActionButton>
                ) : undefined
              }
            />
          ) : (
            <MitigationTaskTable
              showCreatedAt
              tasks={mitigations}
              onOpenDetail={handleOpenDetail}
              onReport={(task, trigger) => {
                detailTriggerRef.current = trigger;
                setOpenedFromWork(false);
                openReportForm(task);
              }}
            />
          )}

        {!loading && mitigations.length > 0 && (
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
        )}
        </CollectionTableCard>
      </div>

      <MitigationProgressFlowDialog
        open={showMitigationDialog}
        onOpenChange={(open) => {
          setShowMitigationDialog(open);
          if (!open) {
            setShowValidationErrors(false);
            setSelectedTask(null);
            setSubmitError("");
            setReportSent(false);
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
        reportSent={reportSent}
        submitError={submitError}
        dirty={Boolean(selectedTask && (
          notes !== (selectedTask.notes || "") ||
          evidenceUrl !== (selectedTask.evidenceUrl || "")
        ))}
        submitting={submitting}
        onViewChange={setDialogView}
        detailTitle="Detail Laporan Penanganan"
        detailDescription="Tinjau status, bukti, dan catatan penanganan."
        detailContent={
          detailTask ? (
            <div className="space-y-6">
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
                          detailStatus === "done"
                            ? "bg-success"
                            : detailStatus === "overdue"
                              ? "bg-destructive"
                              : "bg-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      {getMitigationReportLabel({ ...detailTask, status: detailStatus ?? detailTask.status })}
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
                      <span><span data-date-time="">{formatDate(detailTask.dueDate)}</span></span>
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
                          <span data-date-time="">{formatDate(detailTask.reportedAt)}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Link Bukti
                  </p>
                  <div className="flex min-w-0 flex-col items-start gap-1 text-sm font-medium">
                    {parseEvidenceUrls(detailTask.evidenceUrl).length > 0 ? (
                      parseEvidenceUrls(detailTask.evidenceUrl).map((url) => (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full min-w-0 items-start gap-2 text-foreground hover:text-primary"
                          onClick={(event) => event.stopPropagation()}
                          title={url}
                          key={url}
                        >
                          <Link2
                            className="size-5 shrink-0 text-muted-foreground"
                            strokeWidth={1.6}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 break-all">{url}</span>
                          <ExternalLink
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </a>
                      ))
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
          ) : null
        }
        detailAction={
          reportSent && openedFromWork ? (
            <ActionButton asChild>
              <Link href="/work">Kembali ke To-Do</Link>
            </ActionButton>
          ) : detailTask && detailReportAction?.allowed ? (
            <AccentButton
              onClick={() => openReportForm(detailTask, selectedTask?.id === detailTask.id)}
              icon={<Send className="size-3" />}
            >
              {detailReportAction.label}
            </AccentButton>
          ) : null
        }
        formTitle={detailReportAction?.allowed ? detailReportAction.label : "Isi laporan"}
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
            {submitting ? "Mengirim…" : submitError ? "Coba kirim lagi" : "Kirim laporan"}
          </AccentButton>
        }
        evidenceId="monitoring-evidence-url"
        notesId="monitoring-notes"
      />
    </div>
  );
}
