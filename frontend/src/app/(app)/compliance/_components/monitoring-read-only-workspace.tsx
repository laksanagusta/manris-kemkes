"use client";

import { MitigationProgressIndicator } from "@/components/shared/design-system/domain/mitigation-progress-indicator";

import { RiskTransactionBadge } from "@/components/shared/design-system/domain/risk-transaction-badge";


import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { RiskTableIdentity } from "@/components/shared/design-system/domain/risk-table-identity";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { listRiskMonitorings } from "@/lib/api/risk-monitoring";
import { useAuth } from "@/contexts/auth-context";
import { filterToAccessibleOrgs } from "@/lib/organization";
import {
  buildMonitoringQueryString,
  buildMonitoringTransactionRows,
  getOrganizationScopeIds,
  getMonitoringStatusLabel,
  parseMonitoringQueryState,
  type MonitoringOverviewRow,
  type MonitoringStatusFilter,
} from "@/lib/monitoring-overview";
import {
  getAssessmentCycleFilterOptions,
} from "@/lib/risk-cycle-options";
import {
  CollectionEmptyState,
  CollectionErrorState,
  TableLoadingSkeleton,
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
import { MonitoringScoreComparison, MonitoringLevelBadge } from "@/components/shared/design-system/domain/monitoring-score-cells";
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

  return createDisplayDateFormatter("id-ID", {
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



export function MonitoringReadOnlyWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const cycleOptions = useMemo(
    () => getAssessmentCycleFilterOptions(undefined, searchParams.get("cycle") === "all" ? "" : searchParams.get("cycle") || ""),
    [searchParams],
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
  const [limit, setLimit] = useState(Math.min(100, initialQuery.limit));
  const [pageRows, setPageRows] = useState<MonitoringOverviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ draft: number; final: number } | null>(null);
  const [revision, setRevision] = useState(0);
  const [organizationsReady, setOrganizationsReady] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, [accessibleOrganizations, user]);

  const collectionSort = useRemoteCollectionSorting({
    Risiko: "title",
    Periode: "assessment_cycle",
    Status: "status",
    "Perubahan Skor": "score_change",
    Level: "observed_score",
    Penanganan: "mitigation_completion_percent",
  }, () => setPage(1), "Tanggal Dibuat");
  const deferredSearch = useDeferredValue(search.trim());
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setOrganizationError(null);
    listAllOrganizations(token).then((data) => {
      if (!active) return;
      setOrganizations(data);
      setOrganizationsReady(true);
    }).catch(() => {
      if (!active) return;
      setOrganizationError("Cakupan organisasi belum berhasil dimuat.");
    });
    return () => { active = false; };
  }, [token, revision]);

  const scopedOrganizationId = useMemo(() => {
    if (!user) return undefined;
    if (!user.isGlobal) return user.organizationId || undefined;
    if (organizationId === "all") return undefined;
    if (!tableOrganizations.some((organization) => organization.id === organizationId)) return undefined;
    return [...getOrganizationScopeIds(tableOrganizations, organizationId)].join(",");
  }, [organizationId, tableOrganizations, user]);
  const assessmentCycle = cycle === "all" ? undefined : cycle;
  const canLoad = organizationsReady && !!user && (user.isGlobal || !!scopedOrganizationId);

  useEffect(() => {
    if (!token || !canLoad) return;
    let active = true;
    setLoading(true);
    setError(null);
    listRiskMonitorings(token, {
      org_id: scopedOrganizationId,
      assessment_cycle: assessmentCycle,
      transaction_kind: "monitoring",
      status: status === "finalized" ? "final" : status === "in_progress" ? "draft" : undefined,
      q: deferredSearch || undefined,
      sort_by: collectionSort.sortBy,
      sort_order: collectionSort.sortOrder,
      page,
      limit,
    }).then((result) => {
      if (!active) return;
      setTotal(result.total);
      const lastPage = Math.max(1, Math.ceil(result.total / limit));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setPageRows(buildMonitoringTransactionRows(result.data ?? [], organizations));
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Data pemantauan belum berhasil dimuat.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [token, canLoad, scopedOrganizationId, assessmentCycle, status, deferredSearch, collectionSort.sortBy, collectionSort.sortOrder, page, limit, revision, organizations]);

  useEffect(() => {
    if (!token || !canLoad) return;
    let active = true;
    setSummary(null);
    const params = {
      org_id: scopedOrganizationId,
      assessment_cycle: assessmentCycle,
      transaction_kind: "monitoring" as const,
      limit: 1,
    };
    Promise.all([
      listRiskMonitorings(token, { ...params, status: "draft" }),
      listRiskMonitorings(token, { ...params, status: "final" }),
    ]).then(([drafts, final]) => {
      if (active) setSummary({ draft: drafts.total, final: final.total });
    }).catch(() => {
      if (active) setSummary(null);
    });
    return () => { active = false; };
  }, [token, canLoad, scopedOrganizationId, assessmentCycle, revision]);

  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [reload]);

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
      organizationsReady && organizationId !== "all" &&
      !tableOrganizations.some(
        (organization) => organization.id === organizationId,
      )
    ) {
      setOrganizationId("all");
      setPage(1);
    }
  }, [organizationId, tableOrganizations, organizationsReady]);

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    row: MonitoringOverviewRow,
  ) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    router.push(getActionHref(row));
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-6" aria-label="Ringkasan pemantauan">
        <MetricGrid className="md:grid-cols-2 xl:grid-cols-2">
          <KpiCard
            label="Draf"
            value={summary?.draft ?? "—"}
            tone="white"
          />
          <KpiCard
            label="Final"
            value={summary?.final ?? "—"}
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
                  id: "organization", organizationScope: true,
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

        {(error || organizationError) ? (
          <CollectionErrorState
            title="Data Pemantauan Tidak Tersedia"
            message="Daftar pemantauan belum berhasil dimuat. Coba lagi untuk mengambil data terbaru."
            onReload={reload}
          />
        ) : loading ? (
          <CollectionTableCard sorting={collectionSort.controls}>
            <TableLoadingSkeleton message="Memuat status pemantauan..." />
          </CollectionTableCard>
        ) : (
          <>
            <CollectionTableCard sorting={collectionSort.controls}>
              <Table className="w-full min-w-[1138px] table-fixed">
                <colgroup>
                  <col style={{ width: 132 }} />
                  <col style={{ width: 340 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 154 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 156 }} />
                  <col style={{ width: 142 }} />
                </colgroup>
                <CollectionTableHeader density="compact">
                  <CollectionTableHeaderRow>
                    <CollectionTableHead>Kode risiko</CollectionTableHead>
                    <CollectionTableHead className="">Risiko</CollectionTableHead>
                    <CollectionTableHead >Periode</CollectionTableHead>
                    <CollectionTableHead >Status</CollectionTableHead>
                    <CollectionTableHead >Perubahan Skor</CollectionTableHead>
                    <CollectionTableHead >Level</CollectionTableHead>
                    <CollectionTableHead >Tanggal Dibuat</CollectionTableHead>
                    <CollectionTableHead>Penanganan</CollectionTableHead>
                  </CollectionTableHeaderRow>
                </CollectionTableHeader>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="">
                        <CollectionEmptyState
                          title="Belum ada transaksi pemantauan"
                          description="Belum ada transaksi pemantauan untuk siklus atau filter yang dipilih."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((row) => {
                      const actionHref = getActionHref(row);

                      const statusLabel = getMonitoringStatusLabel(row.status);
                      return (
                        <TableRow
                          key={row.id}
                          tabIndex={0}
                          className="cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
                          aria-label={`${row.code} ${row.title}, status ${statusLabel}`}
                          onClick={(event) => {
                            if ((event.target as Element).closest("a,button")) return;
                            router.push(actionHref);
                          }}
                          onKeyDown={(event) => handleRowKeyDown(event, row)}
                        >
                          <TableCell><CollectionCode code={row.code} href={actionHref} /></TableCell>
                          <TableCell className="min-w-0 max-w-0 overflow-hidden">
                            <RiskTableIdentity title={row.title} href={actionHref} />
                            <RiskTransactionBadge record={row} />
                          </TableCell>
                          <TableCell className="max-w-0 truncate">
                            {row.assessmentCycle || "-"}
                          </TableCell>
                          <TableCell className="max-w-0">
                            <Badge variant={row.status === "finalized" ? "default" : "secondary"}
                              className={row.status === "finalized" ? "max-w-full truncate border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "max-w-full truncate"}
                            >
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-0 overflow-hidden">
                            <MonitoringScoreComparison row={row} />
                          </TableCell>
                          <TableCell>
                            <MonitoringLevelBadge row={row} />
                          </TableCell>
                          <TableCell className="max-w-0">
                            <span data-date-time="">{formatMonitoringDate(row.createdAt)}</span>
                          </TableCell>
                          <TableCell className="max-w-0 overflow-hidden">
                            <MitigationProgressIndicator
                              riskTitle={row.title}
                              value={row.mitigationCompletionPercent}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            <CollectionPagination
                itemLabel="risiko"
                page={page}
                pageSize={limit}
                pageSizeOptions={[25, 50, 100]}
                total={total}
                disabled={loading}
                onPageChange={setPage}
                onPageSizeChange={(nextLimit) => {
                  setLimit(nextLimit);
                  setPage(1);
                }}
              />
            </CollectionTableCard>
          </>
        )}
      </section>


    </div>
  );
}
