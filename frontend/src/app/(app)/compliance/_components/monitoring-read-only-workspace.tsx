"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { listWorkingPapers } from "@/lib/api/working-papers";
import { useAuth } from "@/contexts/auth-context";
import { filterToAccessibleOrgs } from "@/lib/organization";
import {
  buildMonitoringOrganizationSummaries,
  buildMonitoringQueryString,
  buildMonitoringRosterRows,
  filterMonitoringRows,
  getMonitoringStatusLabel,
  parseMonitoringQueryState,
  type MonitoringOverviewRow,
  type MonitoringStatusFilter,
} from "@/lib/monitoring-overview";
import {
  currentMonitoringCycle,
  getSelectableMonitoringCycles,
} from "@/lib/risk-cycle-options";
import {
  getLinearRiskLevelBadgeTone,
  getLinearStatusBadgeTone,
} from "@/lib/linear-status-badge";
import { formatMonitoringNilai } from "@/lib/risk-register-monitoring";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  CollapsibleCard,
  CollectionEmptyState,
  CollectionErrorState,
  CollectionFilterTrigger,
  CollectionLoadingState,
  CollectionPagination,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  KpiCard,
  MetricGrid,
  StandardCard,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Building2,
  RefreshCcw,
} from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import type { WorkingPaper } from "@/types/working-paper";

const WORKING_PAPER_PAGE_SIZE = 100;

const STATUS_OPTIONS: Array<{
  value: MonitoringStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Semua status" },
  { value: "not_started", label: "Belum Dimulai" },
  { value: "in_progress", label: "Berlangsung" },
  { value: "finalized", label: "Final" },
];

async function listAllWorkingPapersForCycle(token: string, cycle: string) {
  const firstPage = await listWorkingPapers(token, {
    assessment_cycle: cycle,
    page: 1,
    limit: WORKING_PAPER_PAGE_SIZE,
  });
  const firstData = firstPage.data ?? [];
  const pageSize = firstPage.limit || WORKING_PAPER_PAGE_SIZE;
  const totalPages = Math.max(
    1,
    Math.ceil((firstPage.total ?? firstData.length) / pageSize),
  );

  if (totalPages === 1) return firstData;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listWorkingPapers(token, {
        assessment_cycle: cycle,
        page: index + 2,
        limit: pageSize,
      }),
    ),
  );

  return [
    ...firstData,
    ...remainingPages.flatMap((response) => response.data ?? []),
  ];
}

function formatFinalizedAt(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getActionHref(row: MonitoringOverviewRow) {
  return row.status === "not_started"
    ? `/risk/register/${row.sourceRiskId}`
    : row.monitoringId
      ? `/risk/monitoring/${row.monitoringId}`
      : `/risk/register/${row.sourceRiskId}`;
}

function ScoreComparison({ row }: { row: MonitoringOverviewRow }) {
  const observedLabel = row.observedLevel !== "-" ? row.observedLevel : null;
  const observedTone = observedLabel
    ? getLinearRiskLevelBadgeTone(observedLabel)
    : "neutral";

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 whitespace-nowrap"
      aria-label={`Skor awal ${formatMonitoringNilai(row.sourceScore)}; skor hasil pemantauan ${formatMonitoringNilai(row.observedScore)}${observedLabel ? `, ${observedLabel}` : ""}`}
    >
      <span className="font-mono text-sm tabular-nums text-muted-foreground/70 line-through decoration-border">
        {formatMonitoringNilai(row.sourceScore)}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/60"
      />
      {row.observedScore !== null ? (
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-medium tabular-nums text-foreground">
            {formatMonitoringNilai(row.observedScore)}
          </span>
          {observedLabel ? (
            <Badge size="micro" tone={observedTone}>
              {observedLabel}
            </Badge>
          ) : null}
        </span>
      ) : (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          -
        </span>
      )}
    </div>
  );
}

function OrganizationSummaryTable({
  summaries,
}: {
  summaries: ReturnType<typeof buildMonitoringOrganizationSummaries>;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[680px] table-fixed">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
        </colgroup>
        <CollectionTableHeader density="compact">
          <CollectionTableHeaderRow>
            <CollectionTableHead className="pl-4 pr-3">
              Organisasi
            </CollectionTableHead>
            <CollectionTableHead className="px-3 text-right">
              Total
            </CollectionTableHead>
            <CollectionTableHead className="px-3 text-right">
              Belum Dimulai
            </CollectionTableHead>
            <CollectionTableHead className="px-3 text-right">
              Berlangsung
            </CollectionTableHead>
            <CollectionTableHead className="px-3 text-right">
              Final
            </CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          {summaries.map((summary) => (
            <TableRow key={summary.id} className="h-12">
              <TableCell className="py-2 pl-4 pr-3">
                <div
                  className="flex items-center gap-2"
                  style={{ paddingLeft: `${summary.depth * 18}px` }}
                >
                  {summary.hasChildren ? (
                    <Building2
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  ) : (
                    <span aria-hidden="true" className="size-3.5 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "truncate text-sm",
                      summary.isAggregate
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground",
                    )}
                    title={summary.name}
                  >
                    {summary.name}
                  </span>
                  {summary.total === 0 ? (
                    <Badge size="micro" tone="neutral">
                      Belum Ada Data
                    </Badge>
                  ) : summary.isAggregate ? (
                    <span className="text-[11px] text-muted-foreground">
                      agregat
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="px-3 py-2 text-right font-mono text-sm tabular-nums text-foreground">
                {summary.total}
              </TableCell>
              <TableCell className="px-3 py-2 text-right font-mono text-sm tabular-nums text-muted-foreground">
                {summary.notStarted}
              </TableCell>
              <TableCell className="px-3 py-2 text-right font-mono text-sm tabular-nums text-muted-foreground">
                {summary.inProgress}
              </TableCell>
              <TableCell className="px-3 py-2 text-right font-mono text-sm tabular-nums text-foreground">
                {summary.finalized}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MonitoringOrganizationSummaryCollapsible({
  cycle,
  loading,
  summaries,
}: {
  cycle: string;
  loading: boolean;
  summaries: ReturnType<typeof buildMonitoringOrganizationSummaries>;
}) {
  return (
    <CollapsibleCard.Root defaultOpen={false}>
      <CollapsibleCard.Trigger>
        <CollapsibleCard.Header>
          <CollapsibleCard.Icon />
          <CollapsibleCard.Title>
            Rekap per Organisasi
          </CollapsibleCard.Title>
        </CollapsibleCard.Header>
        <CollapsibleCard.Actions>
          <Badge size="micro" tone="neutral">
            {cycle}
          </Badge>
        </CollapsibleCard.Actions>
      </CollapsibleCard.Trigger>

      <CollapsibleCard.Content>
        <CollapsibleCard.Body className="p-0">
          {loading ? (
            <CollectionLoadingState message="Memuat rekap organisasi..." />
          ) : summaries.length === 0 ? (
            <CollectionEmptyState
              title="Belum ada organisasi dalam scope"
              description="Scope organisasi yang dapat dibaca belum memiliki data untuk diringkas."
            />
          ) : (
            <OrganizationSummaryTable summaries={summaries} />
          )}
        </CollapsibleCard.Body>
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}

export function MonitoringReadOnlyWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const currentCycle = useMemo(() => currentMonitoringCycle(), []);
  const cycleOptions = useMemo(
    () => getSelectableMonitoringCycles(currentCycle),
    [currentCycle],
  );
  const initialQuery = useMemo(
    () =>
      parseMonitoringQueryState(
        new URLSearchParams(searchParams.toString()),
        currentCycle,
      ),
    [searchParams, currentCycle],
  );

  const [search, setSearch] = useState(initialQuery.search);
  const [status, setStatus] = useState<MonitoringStatusFilter>(initialQuery.status);
  const [cycle, setCycle] = useState(initialQuery.cycle);
  const [organizationId, setOrganizationId] = useState(initialQuery.organizationId);
  const [page, setPage] = useState(initialQuery.page);
  const [limit, setLimit] = useState(initialQuery.limit);
  const [rows, setRows] = useState<MonitoringOverviewRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [workingPapers, setWorkingPapers] = useState<WorkingPaper[]>([]);

  const accessibleOrganizations = useMemo(() => {
    if (user?.isGlobal) return organizations;

    return filterToAccessibleOrgs(organizations, user?.accessibleOrgIds ?? []);
  }, [organizations, user?.accessibleOrgIds, user?.isGlobal]);

  const tableOrganizations = useMemo(() => {
    if (user?.isGlobal) return accessibleOrganizations;

    return user?.organizationId
      ? filterToAccessibleOrgs(accessibleOrganizations, [user.organizationId])
      : [];
  }, [accessibleOrganizations, user?.isGlobal, user?.organizationId]);

  const loadData = useCallback(
    async (isInitialLoad = false) => {
      if (!token) return;

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const [organizationData, workingPapers] = await Promise.all([
          listAllOrganizations(token),
          listAllWorkingPapersForCycle(token, cycle),
        ]);
        const scopedOrganizations = user?.isGlobal
          ? organizationData
          : filterToAccessibleOrgs(
              organizationData,
              user?.accessibleOrgIds ?? [],
            );
        const scopedWorkingPapers = user?.isGlobal
          ? workingPapers
          : workingPapers.filter(
              (workingPaper) =>
                user?.accessibleOrgIds.includes(workingPaper.org_id),
            );
        const tableWorkingPapers = user?.isGlobal
          ? scopedWorkingPapers
          : scopedWorkingPapers.filter(
              (workingPaper) =>
                workingPaper.org_id === user?.organizationId,
            );

        setOrganizations(scopedOrganizations);
        setWorkingPapers(scopedWorkingPapers);
        setRows(
          buildMonitoringRosterRows(tableWorkingPapers, scopedOrganizations),
        );
      } catch (loadError) {
        console.error(loadError);
        setRows([]);
        setWorkingPapers([]);
        setOrganizations([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Data pemantauan belum berhasil dimuat.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cycle, token, user?.accessibleOrgIds, user?.isGlobal, user?.organizationId],
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadData]);

  useEffect(() => {
    const nextQuery = buildMonitoringQueryString(
      { search, status, cycle, organizationId, page, limit },
      currentCycle,
    );
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [
    currentCycle,
    cycle,
    limit,
    organizationId,
    page,
    pathname,
    router,
    search,
    searchParams,
    status,
  ]);

  useEffect(() => {
    if (
      organizationId !== "all" &&
      !tableOrganizations.some(
        (organization) => organization.id === organizationId,
      )
    ) {
      setOrganizationId("all");
      setPage(1);
    }
  }, [organizationId, tableOrganizations]);

  const scopedRows = useMemo(
    () => filterMonitoringRows(rows, organizationId, tableOrganizations, "", "all"),
    [organizationId, rows, tableOrganizations],
  );
  const filteredRows = useMemo(
    () =>
      filterMonitoringRows(
        rows,
        organizationId,
        tableOrganizations,
        search,
        status,
      ),
    [organizationId, rows, search, status, tableOrganizations],
  );
  const supportingRows = useMemo(
    () => buildMonitoringRosterRows(workingPapers, accessibleOrganizations),
    [accessibleOrganizations, workingPapers],
  );
  const summaries = useMemo(
    () =>
      buildMonitoringOrganizationSummaries(
        supportingRows,
        accessibleOrganizations,
        organizationId,
      ),
    [accessibleOrganizations, organizationId, supportingRows],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );
  const finalizedCount = scopedRows.filter(
    (row) => row.status === "finalized",
  ).length;
  const progressPercent = scopedRows.length
    ? Math.round((finalizedCount / scopedRows.length) * 100)
    : 0;

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setOrganizationId("all");
    setPage(1);
    setFilterOpen(false);
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    row: MonitoringOverviewRow,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(getActionHref(row));
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-4" aria-label="Ringkasan pemantauan">
        <MetricGrid className="md:grid-cols-3 xl:grid-cols-3">
          <KpiCard
            label="Belum Dimulai"
            value={error ? "—" : scopedRows.filter((row) => row.status === "not_started").length}
            tone="white"
            description="Risiko dalam snapshot tanpa pemantauan."
          />
          <KpiCard
            label="Berlangsung"
            value={error ? "—" : scopedRows.filter((row) => row.status === "in_progress").length}
            tone="white"
            description="Draft pemantauan yang masih dikerjakan owner."
          />
          <KpiCard
            label="Final"
            value={error ? "—" : finalizedCount}
            tone="white"
            description="Pemantauan terkunci dan siap menjadi dasar tahap berikutnya."
          />
        </MetricGrid>

        <StandardCard title="Progress keseluruhan">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {finalizedCount} dari {scopedRows.length} risiko sudah Final
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Berdasarkan snapshot Kertas Kerja {cycle}.
                </p>
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {error ? "—" : `${progressPercent}%`}
              </span>
            </div>
            <Progress
              value={error ? 0 : progressPercent}
              aria-label={`Progress pemantauan ${progressPercent}%`}
              className="h-2"
            />
          </div>
        </StandardCard>
      </section>

      <section className="space-y-4" aria-label="Daftar status pemantauan">
        <CollectionToolbar
          className="w-full"
          leading={
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <CollectionSearchField
                containerClassName="w-full sm:w-80 sm:flex-none"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode atau risiko"
                aria-label="Cari kode atau risiko"
              />

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Select
                  value={cycle}
                  onValueChange={(value) => {
                    setCycle(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="w-full rounded-lg border border-input bg-card text-sm sm:w-36"
                    aria-label="Pilih siklus pemantauan"
                  >
                    <SelectValue placeholder="Siklus" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <CollectionFilterTrigger />
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={8} className="w-72 rounded-xl p-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          Filter Pemantauan
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Saring berdasarkan status snapshot.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monitoring-status-filter">Status</Label>
                        <Select
                          value={status}
                          onValueChange={(value) => {
                            setStatus(value as MonitoringStatusFilter);
                            setPage(1);
                          }}
                        >
                          <SelectTrigger id="monitoring-status-filter" className="h-10 rounded-lg border border-input bg-card text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <ActionButton size="sm" variant="ghost" onClick={resetFilters}>
                          Reset
                        </ActionButton>
                        <ActionButton size="sm" onClick={() => setFilterOpen(false)}>
                          Terapkan
                        </ActionButton>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          }
          actions={
            <ActionButton
              aria-label="Muat ulang pemantauan"
              disabled={loading || refreshing}
              loading={refreshing}
              icon={<RefreshCcw className="size-3.5" strokeWidth={2.25} />}
              size="icon-xs"
              onClick={() => void loadData(false)}
            />
          }
        />

        {error ? (
          <CollectionErrorState
            title="Data Pemantauan Tidak Tersedia"
            message="Daftar pemantauan belum berhasil dimuat. Coba lagi untuk mengambil data terbaru."
            onReload={() => void loadData(false)}
          />
        ) : loading ? (
          <CollectionTableCard>
            <CollectionLoadingState message="Memuat status pemantauan..." />
          </CollectionTableCard>
        ) : (
          <CollectionTableCard>
            <Table className="w-full table-fixed">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[36%]" />
                <col className="w-[14%]" />
                <col className="w-[24%]" />
                <col className="w-[14%]" />
              </colgroup>
              <CollectionTableHeader density="compact">
                <CollectionTableHeaderRow>
                  <CollectionTableHead className="pl-4 pr-3">Kode</CollectionTableHead>
                  <CollectionTableHead className="px-3">Risiko</CollectionTableHead>
                  <CollectionTableHead className="px-3">Status</CollectionTableHead>
                  <CollectionTableHead className="px-3">
                    Skor Awal → Pemantauan
                  </CollectionTableHead>
                  <CollectionTableHead className="px-3">Finalisasi</CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <CollectionEmptyState
                        title="Belum ada risiko dalam snapshot ini"
                        description="Belum ada risiko yang dipickup ke Kertas Kerja untuk filter yang dipilih."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => {
                    const actionHref = getActionHref(row);
                    const statusTone =
                      row.status === "finalized"
                        ? "success"
                        : getLinearStatusBadgeTone(
                            row.status === "in_progress" ? "draft" : "pending",
                          );

                    return (
                      <TableRow
                        key={row.id}
                        tabIndex={0}
                        className="group h-16 cursor-pointer outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
                        aria-label={`${row.code} ${row.title}, status ${getMonitoringStatusLabel(row.status)}`}
                        onClick={(event) => {
                          if ((event.target as Element).closest("a,button")) return;
                          router.push(actionHref);
                        }}
                        onKeyDown={(event) => handleRowKeyDown(event, row)}
                      >
                        <TableCell className="py-2 pl-4 pr-3 font-mono text-xs text-muted-foreground">
                          {row.code}
                        </TableCell>
                        <TableCell className="min-w-0 px-3 py-2">
                          <div className="min-w-0">
                            <Link
                              href={actionHref}
                              className="block truncate text-sm font-semibold text-foreground hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                              title={row.title}
                            >
                              {row.title}
                            </Link>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {row.workingPaperCode} · {row.assessmentCycle}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge size="compact" tone={statusTone}>
                            {getMonitoringStatusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <ScoreComparison row={row} />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                          {formatFinalizedAt(row.finalizedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <CollectionPagination
              itemLabel="risiko"
              page={currentPage}
              pageSize={limit}
              pageSizeOptions={[25, 50, 100]}
              total={filteredRows.length}
              disabled={loading || refreshing}
              onPageChange={setPage}
              onPageSizeChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
            />
          </CollectionTableCard>
        )}
      </section>

      <MonitoringOrganizationSummaryCollapsible
        cycle={cycle}
        loading={loading}
        summaries={summaries}
      />
    </div>
  );
}
