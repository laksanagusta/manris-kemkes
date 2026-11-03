"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { listAllRiskMonitoringsForCycle } from "@/lib/api/risk-monitoring";
import { useAuth } from "@/contexts/auth-context";
import { filterToAccessibleOrgs } from "@/lib/organization";
import {
  buildMonitoringQueryString,
  buildMonitoringTransactionRows,
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
import { getLinearRiskLevelBadgeTone } from "@/lib/linear-status-badge";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { getRiskLevelFromNilai, levelToColor } from "@/lib/risk";
import { formatMonitoringNilai } from "@/lib/risk-register-monitoring";
import {
  CollectionEmptyState,
  CollectionErrorState,
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
  DynamicTableFilters,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "@/components/shared/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS: Array<{
  value: MonitoringStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Semua status" },
  { value: "in_progress", label: "Draf" },
  { value: "finalized", label: "Final" },
];


function formatMonitoringDate(value: string | null) {
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
  return row.monitoringId
    ? `/risk/monitoring/${row.monitoringId}`
    : `/risk/register/${row.sourceRiskId}`;
}

function ScoreComparison({ row }: { row: MonitoringOverviewRow }) {
  const observedLabel = row.observedLevel !== "-" ? row.observedLevel : null;
  const observedRiskLevel =
    row.observedScore !== null
      ? getRiskLevelFromNilai(row.observedScore)
      : null;
  const observedTone = observedLabel
    ? getLinearRiskLevelBadgeTone(observedLabel)
    : "neutral";

  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap"
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
            <Badge
              variant={observedRiskLevel ? "outline" : toBadgeVariant(observedTone)}
              className={
                observedRiskLevel
                  ? levelToColor(observedRiskLevel)
                  : getStatusBadgeClassName(observedTone)
              }
            >
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

function MitigationProgressIndicator({
  riskTitle,
  value,
}: {
  riskTitle: string;
  value: number;
}) {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const percent = Math.min(100, Math.max(0, Math.round(normalizedValue)));
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percent / 100);

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      role="img"
      aria-label={`Progres penanganan ${riskTitle}: ${percent}%`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 18 18"
        className="size-[18px] shrink-0"
      >
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
        />
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth="2"
          transform="rotate(-90 9 9)"
          className="text-violet-400"
        />
      </svg>
      <span className="text-sm leading-5 font-medium tabular-nums text-foreground">
        {percent}%
      </span>
    </div>
  );
}


export function MonitoringReadOnlyWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const requestSequence=useRef(0);
  const currentCycle = useMemo(() => currentMonitoringCycle(), []);
  const cycleOptions = useMemo(
    () => [
      { value: "all", label: "Semua" },
      ...getSelectableMonitoringCycles(currentCycle),
    ],
    [currentCycle],
  );
  const initialQuery = useMemo(
    () => parseMonitoringQueryState(new URLSearchParams(searchParams.toString())),
    [searchParams],
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
      const request=++requestSequence.current;

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const [organizationData, monitorings] = await Promise.all([
          listAllOrganizations(token),
          listAllRiskMonitoringsForCycle(token, cycle),
        ]);
        if(request!==requestSequence.current)return;
        const scopedOrganizations = user?.isGlobal
          ? organizationData
          : filterToAccessibleOrgs(
              organizationData,
              user?.accessibleOrgIds ?? [],
            );
        const scopedMonitorings = user?.isGlobal
          ? monitorings
          : monitorings.filter((monitoring) => {
              const organizationId =
                monitoring.sourceRisk?.organizationId ??
                monitoring.resultRisk?.organizationId;
              return Boolean(
                organizationId &&
                  user?.accessibleOrgIds.includes(organizationId),
              );
            });

        setOrganizations(scopedOrganizations);
        setRows(buildMonitoringTransactionRows(scopedMonitorings, scopedOrganizations));
      } catch (loadError) {
        if(request!==requestSequence.current)return;
        console.error(loadError);
        setRows([]);
        setOrganizations([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Data pemantauan belum berhasil dimuat.",
        );
      } finally {
        if(request===requestSequence.current){setLoading(false);setRefreshing(false);}
      }
    },
    [cycle, token, user?.accessibleOrgIds, user?.isGlobal],
  );

  useEffect(() => {
    void loadData(true);
    const sequence=requestSequence;return()=>{sequence.current++;};
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
    );
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [
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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = loading || refreshing ? page : Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );
  const finalizedCount = scopedRows.filter((row) => row.status === "finalized").length;

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

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
      <section className="space-y-6" aria-label="Ringkasan pemantauan">
        <MetricGrid className="md:grid-cols-2 xl:grid-cols-2">
          <KpiCard
            label="Draf"
            value={error ? "—" : scopedRows.filter((row) => row.status === "in_progress").length}
            tone="white"
          />
          <KpiCard
            label="Final"
            value={error ? "—" : finalizedCount}
            tone="white"
          />
        </MetricGrid>
      </section>

      <section className="space-y-4" aria-label="Daftar status pemantauan">
        <CollectionToolbar
          className="w-full"
          leading={
            <DynamicTableFilters
              search={
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
              }
              fields={[
                {
                  id: "organization",
                  label: "Organisasi",
                  value: organizationId,
                  onChange: (value) => {
                    setOrganizationId(value);
                    setPage(1);
                  },
                  options: [
                    { value: "all", label: "Semua organisasi" },
                    ...tableOrganizations.map((organization) => ({
                      value: organization.id,
                      label: organization.name,
                    })),
                  ],
                },
                {
                  id: "cycle",
                  label: "Siklus",
                  value: cycle,
                  onChange: (value) => {
                    setCycle(value);
                    setPage(1);
                  },
                  options: cycleOptions,
                },
                {
                  id: "status",
                  label: "Status",
                  value: status,
                  onChange: (value) => {
                    setStatus(value as MonitoringStatusFilter);
                    setPage(1);
                  },
                  options: STATUS_OPTIONS,
                },
              ]}
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
            <Table className="w-full min-w-0 table-fixed">
              <colgroup>
                <col className="w-[33%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[15%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <CollectionTableHeader density="compact">
                <CollectionTableHeaderRow>
                  <CollectionTableHead className="">Risiko</CollectionTableHead>
                  <CollectionTableHead >Periode</CollectionTableHead>
                  <CollectionTableHead >Status</CollectionTableHead>
                  <CollectionTableHead >Perubahan Skor</CollectionTableHead>
                  <CollectionTableHead >Tanggal Dibuat</CollectionTableHead>
                  <CollectionTableHead >Kelengkapan pelaporan</CollectionTableHead>
                  <CollectionTableHead >Update Terakhir</CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="">
                      <CollectionEmptyState
                        title="Belum ada transaksi pemantauan"
                        description="Belum ada transaksi pemantauan untuk siklus atau filter yang dipilih."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => {
                    const actionHref = getActionHref(row);

                    return (
                      <TableRow
                        key={row.id}
                        tabIndex={0}
                        className="group h-16 cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
                        aria-label={`${row.code} ${row.title}, status ${getMonitoringStatusLabel(row.status)}`}
                        onClick={(event) => {
                          if ((event.target as Element).closest("a,button")) return;
                          router.push(actionHref);
                        }}
                        onKeyDown={(event) => handleRowKeyDown(event, row)}
                      >
                        <TableCell className="min-w-0 max-w-0 overflow-hidden">
                          <div className="min-w-0">
                            <Link
                              href={actionHref}
                              className="block truncate text-sm font-medium text-foreground hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                              title={row.title}
                            >
                              {row.title}
                            </Link>
                            <span className="mt-0.5 block truncate font-mono text-sm leading-5 text-muted-foreground">
                              {row.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-0 truncate">
                          {row.assessmentCycle || "-"}
                        </TableCell>
                        <TableCell className="max-w-0">
                          <Badge variant={row.status === "finalized" ? "default" : "secondary"}
                            className={row.status === "finalized" ? "max-w-full truncate border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "max-w-full truncate"}
                          >
                            {getMonitoringStatusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-0 overflow-hidden">
                          <ScoreComparison row={row} />
                        </TableCell>
                        <TableCell className="max-w-0">
                          {formatMonitoringDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-0 overflow-hidden">
                          <MitigationProgressIndicator
                            riskTitle={row.title}
                            value={row.mitigationCompletionPercent}
                          />
                        </TableCell>
                        <TableCell className="max-w-0">
                          {formatMonitoringDate(row.updatedAt)}
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


    </div>
  );
}
