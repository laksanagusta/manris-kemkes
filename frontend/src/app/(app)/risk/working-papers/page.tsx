"use client";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";
import type { TableFilterField } from "@/components/shared/design-system/collections/dynamic-table-filter-state";

import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { formatDisplayDate } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { RiskTableIdentity } from "@/components/shared/design-system/domain/risk-table-identity";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  listWorkingPapers,
} from "@/lib/api/working-papers";
import type { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { WorkingPaperProgressCollapsible } from "./_components/working-paper-progress-collapsible";

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import {
  CollectionEmptyState,
  CollectionErrorState,
  TableLoadingSkeleton,
  CollectionPagination,
  CollectionPageHeader,
  DynamicTableFilters,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  MonitoringTransactionProgress,
} from "@/components/shared/design-system";
import {
  AccentButton,
  PageStack,
} from "@/components/shared/design-system";
import {
  WorkingPaperCreateDialog,
} from "@/components/shared/working-paper-create-dialog";

type WorkingPaperStatusFilter = "all" | WorkingPaperStatus;

function getWorkingPaperStatusFilter(
  value: string | null,
): WorkingPaperStatusFilter {
  if (
    value === "draft" ||
    value === "signing" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "all";
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

const statusLabels: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses TTE",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusTones = {
  draft: "neutral",
  signing: "progress",
  completed: "success",
  cancelled: "danger",
} as const;

type WorkingPaperFiltersToolbarProps = {
  organizationField?: TableFilterField;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  statusFilter: WorkingPaperStatusFilter;
  onStatusFilterChange: (value: WorkingPaperStatusFilter) => void;
  observationCutoffFilter: string;
  onObservationCutoffFilterChange: (value: string) => void;
  createdAtFilter: string;
  onCreatedAtFilterChange: (value: string) => void;
};

function WorkingPaperFiltersToolbar({
  organizationField,
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  statusFilter,
  onStatusFilterChange,
  observationCutoffFilter,
  onObservationCutoffFilterChange,
  createdAtFilter,
  onCreatedAtFilterChange,
}: WorkingPaperFiltersToolbarProps) {
  return (
    <DynamicTableFilters
      search={
        <CollectionSearchField
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
        />
      }
      fields={[
        ...(organizationField ? [organizationField] : []),
        {
          id: "status",
          label: "Status",
          value: statusFilter,
          onChange: (value) => onStatusFilterChange(value as WorkingPaperStatusFilter),
          options: [
            { value: "all", label: "Semua status" },
            ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
          ],
        },
        {
          id: "observation_cutoff",
          label: "Tanggal batas pengamatan",
          type: "date",
          value: observationCutoffFilter,
          defaultValue: "",
          onChange: onObservationCutoffFilterChange,
        },
        {
          id: "created_at",
          label: "Tanggal dibuat",
          type: "date",
          value: createdAtFilter,
          defaultValue: "",
          onChange: onCreatedAtFilterChange,
        },
      ]}
    />
  );
}

function formatWorkingPaperDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return formatDisplayDate(parsed, options);
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

function WorkingPaperSigningProgress({
  signatories,
}: {
  signatories: WorkingPaper["signatories"];
}) {
  if (signatories.length === 0) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const signedCount = signatories.filter(
    (signatory) => signatory.status === "signed",
  ).length;

  return (
    <MonitoringTransactionProgress
      items={signatories.map((signatory) => ({
        label: signatory.signer_name || `Penandatangan ${signatory.sequence_no}`,
        status: signatory.status === "signed" ? "final" : "draft",
      }))}
      showCount={false}
      ariaLabelOverride={`Progres TTE: ${signedCount} dari ${signatories.length} penandatangan sudah menandatangani.`}
    />
  );
}

export default function WorkingPapersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const isApplyingSearchParamsRef = useRef(false);

  const [papers, setPapers] = useState<WorkingPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<WorkingPaperStatusFilter>(
    () => getWorkingPaperStatusFilter(searchParams.get("status")),
  );
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [observationCutoffFilter, setObservationCutoffFilter] = useState(
    () => searchParams.get("observation_cutoff") ?? "",
  );
  const [createdAtFilter, setCreatedAtFilter] = useState(
    () => searchParams.get("created_at") ?? "",
  );
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), 10),
  );
  const organizationFilter = useOrganizationFilter(() => setPage(1));
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebouncedValue(search, 500);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportingPaperId, setExportingPaperId] = useState<string | null>(null);

  const collectionSort = useRemoteCollectionSorting({"Judul": "title", "Tanggal batas pengamatan": "observation_cutoff", "Status": "status", "Jumlah risiko": "risk_count"}, () => setPage(1));
  const handleExport = useCallback(async (workingPaper: WorkingPaper) => {
    setExportingPaperId(workingPaper.id);
    try {
      const { exportWorkingPaper } = await import("@/lib/working-paper-export");
      await exportWorkingPaper(workingPaper);
      toast.success("KK Pemantauan dan Reviu berhasil diunduh.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengunduh KK Pemantauan dan Reviu.",
      );
    } finally {
      setExportingPaperId(null);
    }
  }, []);

  const listRequest=useRef(0);
  const fetchWorkingPapers = useCallback(
    async (activeToken: string) => {
      const request=++listRequest.current;
      try {
        setLoading(true);
        setError(null);
        const res = await listWorkingPapers(activeToken, {
          org_id: organizationFilter.organizationId === "all" ? undefined : organizationFilter.organizationId,
 sort_by:collectionSort.sortBy, sort_order:collectionSort.sortOrder,
          status: statusFilter === "all" ? undefined : statusFilter,
          q: debouncedSearch.trim() || undefined,
          observation_cutoff: observationCutoffFilter || undefined,
          created_at: createdAtFilter.trim() || undefined,
          page,
          limit,
        });
        if(request!==listRequest.current)return;
        setPapers(res.data ?? []);
        setTotal(res.total ?? 0);
        setPage(res.page ?? page);
        setLimit(res.limit ?? limit);
      } catch (err) {
        if(request!==listRequest.current)return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat daftar KK Pemantauan dan Reviu. Silakan coba lagi.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      createdAtFilter,
      observationCutoffFilter,
      debouncedSearch,
      limit,
      page,
      organizationFilter.organizationId, statusFilter, collectionSort.sortBy, collectionSort.sortOrder,
    ],
  );

  useEffect(() => {
    if (token) {
      fetchWorkingPapers(token);
    }
  }, [fetchWorkingPapers, token]);

  useEffect(() => {
    isApplyingSearchParamsRef.current = true;
    const nextStatusFilter = getWorkingPaperStatusFilter(
      searchParams.get("status"),
    );
    const nextSearch = searchParams.get("q") ?? "";
    const nextObservationCutoffFilter =
      searchParams.get("observation_cutoff") ?? "";
    const nextCreatedAtFilter = searchParams.get("created_at") ?? "";
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);

    setStatusFilter((current) =>
      current === nextStatusFilter ? current : nextStatusFilter,
    );
    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setObservationCutoffFilter((current) =>
      current === nextObservationCutoffFilter
        ? current
        : nextObservationCutoffFilter,
    );
    setCreatedAtFilter((current) =>
      current === nextCreatedAtFilter ? current : nextCreatedAtFilter,
    );
    setPage((current) => (current === nextPage ? current : nextPage));
    setLimit((current) => (current === nextLimit ? current : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    if (isApplyingSearchParamsRef.current) {
      isApplyingSearchParamsRef.current = false;
      return;
    }
    // A browser navigation updates search before its debounce catches up.
    if (search !== debouncedSearch) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("assessment_cycle");
    const normalizedSearch = debouncedSearch.trim();
    const normalizedObservationCutoff = observationCutoffFilter.trim();
    const normalizedCreatedAt = createdAtFilter.trim();

    if (statusFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", statusFilter);
    }

    if (normalizedSearch) {
      nextParams.set("q", normalizedSearch);
    } else {
      nextParams.delete("q");
    }

    if (normalizedObservationCutoff) {
      nextParams.set("observation_cutoff", normalizedObservationCutoff);
    } else {
      nextParams.delete("observation_cutoff");
    }

    if (normalizedCreatedAt) {
      nextParams.set("created_at", normalizedCreatedAt);
    } else {
      nextParams.delete("created_at");
    }

    if (page === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", page.toString());
    }

    if (limit === 10) {
      nextParams.delete("limit");
    } else {
      nextParams.set("limit", limit.toString());
    }

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [
    observationCutoffFilter,
    createdAtFilter,
    debouncedSearch,
    limit,
    page,
    pathname,
    router,
    search,
    searchParams,
    startTransition,
    statusFilter,
  ]);

  const showInitialLoading = loading && papers.length === 0;

  return (
    <PageStack>
      <div className="space-y-4">
        <CollectionPageHeader
          title="KK Pemantauan dan Reviu"
          actions={
            <AccentButton
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              Buat KK Pemantauan dan Reviu
            </AccentButton>
          }
        />

        <CollectionToolbar
          className="w-full"
          leading={
            <WorkingPaperFiltersToolbar
              organizationField={organizationFilter.field}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              searchPlaceholder="Cari judul KK Pemantauan dan Reviu..."
              searchAriaLabel="Cari judul KK Pemantauan dan Reviu"
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              observationCutoffFilter={observationCutoffFilter}
              onObservationCutoffFilterChange={(value) => {
                setObservationCutoffFilter(value);
                setPage(1);
              }}
              createdAtFilter={createdAtFilter}
              onCreatedAtFilterChange={(value) => {
                setCreatedAtFilter(value);
                setPage(1);
              }}
            />
          }
        />

        {error ? (
          <CollectionErrorState
            title="Gagal Memuat Data"
            message={error}
            onReload={() => window.location.reload()}
          />
        ) : null}

        <CollectionTableCard sorting={collectionSort.controls}>

          {showInitialLoading ? (
            <TableLoadingSkeleton message="Memuat daftar KK Pemantauan dan Reviu..." />
          ) : papers.length === 0 ? (
            <CollectionEmptyState
              title="Belum ada KK Pemantauan dan Reviu yang sesuai filter"
              description="Ubah filter pencarian atau tab status untuk melihat data lain."
            />
          ) : (
            <Table className="min-w-[1240px] table-fixed">
              <colgroup>
                <col style={{ width: 160 }} />
                <col style={{ width: 360 }} />
                <col style={{ width: 124 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 132 }} />
                <col style={{ width: 204 }} />
                <col style={{ width: 148 }} />
              </colgroup>
              <CollectionTableHeader density="compact">
                <CollectionTableHeaderRow>
                  <CollectionTableHead>Kode KK Pemantauan dan Reviu</CollectionTableHead>
                  <CollectionTableHead className="">
                    Judul
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Tanggal batas pengamatan
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Status
                  </CollectionTableHead>
                  <CollectionTableHead className="text-right">
                    Jumlah risiko
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Progres TTE
                  </CollectionTableHead>
                  <CollectionTableHead >
                    Dibuat
                  </CollectionTableHead>
                </CollectionTableHeaderRow>
              </CollectionTableHeader>
              <TableBody>
                {papers.map((paper) => {
                  const createdDate = formatWorkingPaperDate(
                    paper.created_at,
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    },
                  );

                  return (
                    <TableRow
                      key={paper.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell><CollectionCode code={paper.code} href={`/risk/working-papers/${paper.id}`} /></TableCell>
                      <TableCell className="min-w-[320px] align-middle">
                        <RiskTableIdentity
                          title={paper.title || "Tanpa Judul"}
                          href={`/risk/working-papers/${paper.id}`}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-middle">
                        {paper.observation_cutoff
                          ? formatWorkingPaperDate(paper.observation_cutoff, { dateStyle: "medium", timeZone: "Asia/Jakarta" })
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-middle">
                        <Badge variant={toBadgeVariant(statusTones[paper.status])}
                          className={getStatusBadgeClassName(statusTones[paper.status])}
                        >
                          {statusLabels[paper.status] || paper.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right align-middle tabular-nums">
                        {paper.risks?.length || 0}
                      </TableCell>
                      <TableCell className="min-w-[180px] align-middle">
                        <WorkingPaperSigningProgress
                          signatories={paper.signatories}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-middle">
                        <span data-date-time="">{createdDate}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        <CollectionPagination
          itemLabel="dokumen"
          page={page}
          pageSize={limit}
          total={total}
          disabled={loading || isPending}
          onPageChange={setPage}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
        </CollectionTableCard>
      </div>
      <WorkingPaperProgressCollapsible
        workingPapers={papers}
        loading={loading}
        exportingPaperId={exportingPaperId}
        onExport={(workingPaper) => void handleExport(workingPaper)}
      />
      <WorkingPaperCreateDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        token={token}
        organizationId={user?.organizationId}
      />
    </PageStack>
  );
}
