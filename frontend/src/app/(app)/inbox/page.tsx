"use client";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";

import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { formatDisplayDate } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  FileSignature,
  FileText,
} from "@/components/shared/icons";

import { Badge } from "@/components/ui/badge";
import {
  CollectionPagination,
  CollectionPageHeader,
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionSearchField,
  DynamicTableFilters,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  KpiCard,
} from "@/components/shared/design-system";
import {
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { getLinearStatusBadgeClassName, getLinearStatusBadgeTone } from "@/lib/linear-status-badge";

interface ApprovalRequest {
  entityOrgId?: string;
  id: string;
  requestType: string;
  entityId: string;
  entityCode?: string;
  entityTitle?: string;
  entityOrgName?: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  createdAt?: string;
  currentStatus: "pending" | "approved" | "rejected";
  currentApproverRole: string;
  currentApproverUserId?: string | null;
  notes?: string;
}

interface WorkingPaperSigningItem {
  organizationId?: string;
  id: string;
  requestType: "working_paper";
  workingPaperId: string;
  title: string;
  description: string;
  assessmentCycle: string;
  sequenceNo: number;
  signerPangkat: string;
  status: "pending_signing";
  createdAt: string;
}

type InboxItem = ApprovalRequest | WorkingPaperSigningItem;

const statusLabel: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  submitted: "Menunggu Review",
  revision_requested: "Revisi Diminta",
  pending_signing: "Menunggu TTE",
};

const requestTypeConfig: Record<
  string,
  {
    icon: typeof FileText;
    label: string;
    href: (id: string, extraId?: string) => string;
  }
> = {
  risk: {
    icon: FileText,
    label: "Risiko",
    href: (id) => `/risk/register/${id}`,
  },
  assessment: {
    icon: FileText,
    label: "Penilaian Risiko",
    href: (id) => `/risk/monitoring/${id}`,
  },
  working_paper: {
    icon: FileSignature,
    label: "KK Pemantauan dan Reviu",
    href: (id) => `/risk/working-papers/${id}`,
  },
};

function formatDate(dateString?: string) {
  if (!dateString || !Number.isFinite(Date.parse(dateString))) return "—";
  return formatDisplayDate(new Date(dateString), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), 1_000_000_000);
}

interface InboxResponse {
  data: InboxItem[];
  total: number;
  counts: { all: number; myApprovals: number; approved: number; rejected: number };
}

export default function InboxPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const [isPending, startTransition] = useTransition();
  const skipUrlWrite = useRef(false);
  const [filter, setFilter] = useState<
    "all" | "my_approvals" | "approved" | "rejected"
  >(() => {
    const value = searchParams.get("status");
    if (value === "all" || value === "approved" || value === "rejected") {
      return value;
    }
    if (
      value === "my_approvals" ||
      value === "pending_review" ||
      value === "pending_approval"
    ) {
      return "my_approvals";
    }
    return "all";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [result, setResult] = useState<InboxResponse>();
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    Math.min(parsePositiveInt(searchParams.get("limit"), 10), 100),
  );
  const organizationFilter = useOrganizationFilter(() => setPage(1));
  const collectionSort = useRemoteCollectionSorting(
    { Kode: "code", Entitas: "title", Status: "status", Jenis: "type" },
    () => setPage(1),
  );
  const deferredSearch = useDeferredValue(search);
  const refreshRequests = () => setReloadVersion((version) => version + 1);

  useEffect(() => {
    skipUrlWrite.current = true;
    const queryStatus = searchParams.get("status");
    const querySearch = searchParams.get("search");
    setTypeFilter(searchParams.get("type") ?? "all");
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = Math.min(parsePositiveInt(searchParams.get("limit"), 10), 100);

    if (
      queryStatus === "all" ||
      queryStatus === "approved" ||
      queryStatus === "rejected"
    ) {
      setFilter(queryStatus);
    } else if (
      queryStatus === "my_approvals" ||
      queryStatus === "pending_review" ||
      queryStatus === "pending_approval"
    ) {
      setFilter("my_approvals");
    } else {
      setFilter("all");
    }
    setSearch(querySearch ?? "");
    setPage((current) => (current === nextPage ? current : nextPage));
    setLimit((current) => (current === nextLimit ? current : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort_by: collectionSort.sortBy,
      sort_order: collectionSort.sortOrder,
    });
    if (filter !== "all") params.set("status", filter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (organizationFilter.organizationId !== "all") {
      params.set("organization_id", organizationFilter.organizationId);
    }
    if (deferredSearch.trim()) params.set("q", deferredSearch.trim());

    api.get<InboxResponse>(`/inbox?${params}`, token)
      .then((response) => {
        if (cancelled) return;
        setResult(response);
        const lastPage = Math.max(1, Math.ceil(response.total / limit));
        if (page > lastPage) setPage(lastPage);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, page, limit, filter, typeFilter, organizationFilter.organizationId,
    deferredSearch, collectionSort.sortBy, collectionSort.sortOrder, reloadVersion]);

  useEffect(() => {
    if (skipUrlWrite.current) {
      skipUrlWrite.current = false;
      return;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    if (typeFilter === "all") nextParams.delete("type");
    else nextParams.set("type", typeFilter);

    if (filter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", filter);
    }

    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      nextParams.set("search", normalizedSearch);
    } else {
      nextParams.delete("search");
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

    if (nextUrl === currentUrl) return;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [
    filter,
    search,
    typeFilter,
    page,
    limit,
    pathname,
    router,
    searchParams,
    startTransition,
  ]);

  const getStatus = (item: InboxItem): string => {
    if (item.requestType === "working_paper") {
      return (item as WorkingPaperSigningItem).status;
    }
    return (item as ApprovalRequest).currentStatus;
  };

  const counts = result?.counts ?? { all: 0, myApprovals: 0, approved: 0, rejected: 0 };
  const requests = result?.data ?? [];

  const summaryCards = [
    {
      label: "Total",
      value: counts.all,
      tone: "white" as const,
    },
    {
      label: "Perlu Tindakan",
      value: counts.myApprovals,
      tone: "zinc" as const,
    },
    {
      label: "Disetujui",
      value: counts.approved,
      tone: "emerald" as const,
    },
    {
      label: "Ditolak",
      value: counts.rejected,
      tone: "rose" as const,
    },
  ];

  if (loading && !result) {
    return (
      <PageStack>
        <CollectionLoadingState message="Memuat daftar persetujuan..." />
      </PageStack>
    );
  }

  if (error) {
    return (
      <PageStack>
        <CollectionErrorState
          title="Gagal Memuat Data"
          message={error}
          onReload={refreshRequests}
        />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <CollectionPageHeader
        title="Persetujuan & TTE"
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone="white"
          />
        ))}
      </MetricGrid>

      <div className="space-y-4">
      <CollectionToolbar
        leading={
          <DynamicTableFilters
            search={
              <CollectionSearchField
                placeholder="Cari kode, judul, unit, atau pemohon..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                aria-label="Cari permintaan persetujuan"
              />
            }
            fields={[
              organizationFilter.field,
              {
                id: "status",
                label: "Status",
                value: filter,
                onChange: (value) => {
                  setFilter(value as typeof filter);
                  setPage(1);
                },
                options: [
                  { value: "all", label: "Semua status" },
                  { value: "my_approvals", label: "Persetujuan saya" },
                  { value: "approved", label: "Disetujui" },
                  { value: "rejected", label: "Ditolak" },
                ],
              },
              {
                id: "type",
                label: "Jenis",
                value: typeFilter,
                onChange: (value) => {
                  setTypeFilter(value);
                  setPage(1);
                },
                options: [
                  { value: "all", label: "Semua jenis" },
                  ...Object.entries(requestTypeConfig).map(([value, config]) => ({ value, label: config.label })),
                ],
              },
            ]}
          />
        }
      />

      <CollectionTableCard sorting={collectionSort.controls}>
        <Table className="min-w-[980px] table-fixed">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[25%]" />
            <col className="w-[19%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead>Kode</CollectionTableHead>
              <CollectionTableHead className="">Entitas</CollectionTableHead>
              <CollectionTableHead>Keterangan</CollectionTableHead>
              <CollectionTableHead>Jenis</CollectionTableHead>
              <CollectionTableHead title="Waktu pembuatan permintaan">Dibuat</CollectionTableHead>
              <CollectionTableHead>Status</CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}><CollectionLoadingState message="Memuat daftar persetujuan..." /></TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <CollectionEmptyState
                    title="Belum ada permintaan persetujuan yang sesuai filter"
                    description="Ubah filter pencarian untuk melihat data lain."
                    className="min-h-24 py-6"
                  />
                </TableCell>
              </TableRow>
            ) : (
              requests.map((item) => {
                const typeConfig =
                  requestTypeConfig[item.requestType] ?? requestTypeConfig.risk;
                const Icon = typeConfig.icon;
                const status = getStatus(item);
                const isWorkingPaper = item.requestType === "working_paper";
                const wpItem = isWorkingPaper
                  ? (item as WorkingPaperSigningItem)
                  : null;
                const approvalItem = !isWorkingPaper
                  ? (item as ApprovalRequest)
                  : null;

                const displayCode = isWorkingPaper
                  ? `KK-${wpItem!.workingPaperId.slice(0, 6)}`
                  : approvalItem!.entityCode;
                const displayTitle = isWorkingPaper
                  ? wpItem!.title
                  : approvalItem!.entityTitle;
                const displaySubtitle = isWorkingPaper
                  ? wpItem!.signerPangkat
                    ? `Penandatangan #${wpItem!.sequenceNo} (${wpItem!.signerPangkat})`
                    : `Penandatangan #${wpItem!.sequenceNo}`
                  : approvalItem!.notes ||
                    `Menunggu review ${approvalItem!.currentApproverRole}`;
                const displayDate = isWorkingPaper
                  ? wpItem!.createdAt
                  : approvalItem!.createdAt;
                const entityId = isWorkingPaper
                  ? wpItem!.workingPaperId
                  : approvalItem!.entityId;

                return (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <CollectionCode code={displayCode || `REQ-${item.id.slice(0, 8)}`} href={typeConfig.href(entityId)} />
                    </TableCell>
                    <TableCell className="">
                      <Link
                        href={typeConfig.href(entityId)}
                        className="block truncate hover:text-primary"
                        title={displayTitle || "Tanpa judul"}
                      >
                        {displayTitle || "Tanpa judul"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{displaySubtitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="size-3" />
                          {typeConfig.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3" />
                        <span data-date-time="">{formatDate(displayDate)}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getLinearStatusBadgeTone(status)}
                        className={getLinearStatusBadgeClassName(status)}
                      >
                        {statusLabel[status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

          <CollectionPagination
            itemLabel="permintaan persetujuan"
            page={page}
            pageSize={limit}
            total={result?.total ?? 0}
            disabled={loading || isPending}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
      </CollectionTableCard>
      </div>

    </PageStack>
  );
}
