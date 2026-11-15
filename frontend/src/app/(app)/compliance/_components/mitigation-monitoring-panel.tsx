"use client";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";

import { businessNow } from "@/lib/business-clock";
import { MitigationReportDetail } from "@/components/shared/design-system/domain/mitigation-report-detail";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { MitigationTaskTable } from "@/components/shared/mitigation-task-table";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CollectionEmptyState,
  TableLoadingSkeleton,
  CollectionPagination,
  CollectionSearchField,
  CollectionTableCard,
  CollectionToolbar,
  KpiCard,
  MetricGrid,
  DynamicTableFilters,
} from "@/components/shared/design-system";

import { toast } from "sonner";
import {
  Send,
  Upload,
} from "@/components/shared/icons";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  ActionButton,
  AccentButton,
  MitigationProgressFlowDialog,
} from "@/components/shared/design-system";
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import { getAssessmentCycleFilterOptions } from "@/lib/risk-cycle-options";
import {
  buildMitigationMonitoringApiQueryString,
  buildMitigationMonitoringQueryString,
  parseMitigationMonitoringQueryState,
  mitigationMonitoringStatusOptions,
  type MitigationMonitoringStatusFilter,
} from "@/lib/mitigation-monitoring-query";
import type { MitigationTask } from "@/types/risk";

type MitigationTaskRow = MitigationTask & {
  unit: string;
  mitigationAction: string;
  title: string;
};

type MitigationTaskSummary = { overdue: number; upcoming: number; reported: number };

async function listMitigationTaskPeriods(token: string): Promise<string[]> {
  return api.get<string[]>("/mitigation-tasks/all?periods_only=true", token);
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
  const organizationFilter = useOrganizationFilter(() => pushQueryState({ page: 1 }));

  const [mitigations, setMitigations] = useState<MitigationTaskRow[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<MitigationTaskSummary>({ overdue: 0, upcoming: 0, reported: 0 });
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<MitigationTaskRow | null>(null);
  const [showMitigationDialog, setShowMitigationDialog] = useState(false);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailReportAction = detailTask ? getMitigationTaskReportAction(detailTask) : null;
  const detailStatus = detailReportAction?.isOverdue ? "overdue" : detailTask?.status;
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
    () => getAssessmentCycleFilterOptions(businessNow(), period, availablePeriods),
    [availablePeriods, period],
  );

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
      if (organizationFilter.organizationId !== "all") sortParams.set("org_id", organizationFilter.organizationId);
      if(collectionSort.touched || queryState.status!=="needs_reporting") {
        sortParams.set("sort_by",collectionSort.sortBy);sortParams.set("sort_order",collectionSort.sortOrder);
      }
      const response = await api.get<{ data: MitigationTask[]; total: number; summary: MitigationTaskSummary }>(
        `/mitigation-tasks/all?${sortParams}`,
        token,
      );

      if(generation!==loadGeneration.current)return;
      const rawData = response.data || [];
      setTotal(response.total || 0);
      setSummary(response.summary);
      const processed: MitigationTaskRow[] = rawData.map((m) => ({
          ...m,
          riskCode: m.riskCode || "—",
          title: m.riskTitle || "—",
          unit: m.mitigationOwner || "—",
          mitigationAction: m.mitigationAction || "—",
      }));

      setMitigations(processed);
    } catch (error) {
      console.error(error);
    } finally {
      if(generation===loadGeneration.current)setLoading(false);
    }
  }, [organizationFilter.organizationId, token, page, limit, queryState.search, queryState.status, queryState.period, collectionSort.sortBy,collectionSort.sortOrder,collectionSort.touched]);

  useEffect(() => {
    fetchMitigations();
  }, [fetchMitigations]);

  const openReportForm = useCallback((task: MitigationTaskRow) => {
    if(task.monitoringId){router.push(`/risk/monitoring/${task.monitoringId}`);return;}
    router.push(`/risk/register/new?id=${task.riskId}&tab=monitoring`);
  }, [router]);

  const openTaskDetail = useCallback(
    (task: MitigationTaskRow, trigger: HTMLButtonElement | null) => {
      detailTriggerRef.current = trigger;
      setDetailTask(task);
      setShowMitigationDialog(true);
    },
    [],
  );

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!token || !taskId) return;
    let cancelled = false;
    api.get<MitigationTask>(`/mitigation-tasks/${encodeURIComponent(taskId)}`, token).then(task => {
      if (cancelled) return;
      const row: MitigationTaskRow = { ...task, riskCode: task.riskCode || "—", title: task.riskTitle || "—", unit: task.mitigationOwner || "—", mitigationAction: task.mitigationAction || "—" };
      if (searchParams.get("returnTo") === "/work") {
        openTaskDetail(row, null);
      } else {
        detailTriggerRef.current = null;
        openReportForm(row);
      }
      const next = new URLSearchParams(searchParams.toString());
      next.delete("taskId");
      next.delete("returnTo");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }).catch(() => { if (!cancelled) toast.error("Laporan ini tidak dapat dibuka. Periksa akses dan coba lagi."); });
    return () => { cancelled = true; };
  }, [token, searchParams, router, pathname, openReportForm, openTaskDetail]);

  const hasActiveFilters =
    Boolean(queryState.search || queryState.period) ||
    (queryState.status ?? "all") !== "all";

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
          value={summary.overdue}
          tone="white"
        />
        <KpiCard
          label="Akan Datang"
          value={summary.upcoming}
          tone="white"
        />
        <KpiCard
          label="Sudah dilaporkan"
          value={summary.reported}
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
                organizationFilter.field,
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
            <TableLoadingSkeleton message="Memuat data mitigasi..." />
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
              onOpenDetail={openTaskDetail}
              onReport={(task, trigger) => {
                detailTriggerRef.current = trigger;
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
        readOnly
        onOpenChange={setShowMitigationDialog}
        onCloseAutoFocus={(event) => {
          if (detailTriggerRef.current?.isConnected) {
            event.preventDefault();
            detailTriggerRef.current.focus();
          }
        }}
        detailTitle="Detail Laporan Penanganan"
        detailDescription="Tinjau status, bukti, dan catatan penanganan."
        detailContent={detailTask && <MitigationReportDetail task={detailTask} status={detailStatus} />}
        detailAction={
          detailTask && detailReportAction?.allowed ? (
            <AccentButton
              onClick={() => openReportForm(detailTask)}
              icon={<Send className="size-3" />}
            >
              {detailReportAction.label}
            </AccentButton>
          ) : null
        }
      />
    </div>
  );
}
