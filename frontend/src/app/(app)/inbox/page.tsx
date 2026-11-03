"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  id: string;
  requestType: string;
  entityId: string;
  entityCode?: string;
  entityTitle?: string;
  entityOrgName?: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  currentStatus: "pending" | "approved" | "rejected";
  currentApproverRole: string;
  currentApproverUserId?: string | null;
  notes?: string;
}

interface WorkingPaperSigningItem {
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
    label: "Kertas Kerja",
    href: (id) => `/risk/working-papers/${id}`,
  },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

interface PaginatedApprovalsResponse {
  data: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
}

async function getApprovalRequests(
  token: string,
  params: { status: string; page: number; limit: number },
): Promise<PaginatedApprovalsResponse> {
  const qs = new URLSearchParams({
    status: params.status,
    page: params.page.toString(),
    limit: params.limit.toString(),
  });
  return api.get<PaginatedApprovalsResponse>(
    `/approvals?${qs.toString()}`,
    token,
  );
}

async function getWorkingPaperSigningItems(
  token: string,
): Promise<WorkingPaperSigningItem[]> {
  const response = await api.get<
    {
      id: string;
      working_paper_id: string;
      title: string;
      description: string;
      assessment_cycle: string;
      sequence_no: number;
      signer_pangkat: string;
      created_at: string;
    }[]
  >("/working-papers/pending-signing", token);
  return response.map((item) => ({
    id: item.id,
    requestType: "working_paper" as const,
    workingPaperId: item.working_paper_id ?? item.id,
    title: item.title,
    description: item.description ?? "",
    assessmentCycle: item.assessment_cycle ?? "",
    sequenceNo: item.sequence_no ?? 1,
    signerPangkat: item.signer_pangkat ?? "",
    status: "pending_signing" as const,
    createdAt: item.created_at,
  }));
}

async function getAllInboxItems(token: string): Promise<InboxItem[]> {
  const [approvals, signingItems] = await Promise.all([
    (async () => {
      const rows: ApprovalRequest[] = [];
      let page = 1;
      while (true) {
        const response = await getApprovalRequests(token, { status: "all", page, limit: 100 });
        const data = response.data ?? [];
        rows.push(...data);
        if (data.length === 0 || rows.length >= response.total) return rows;
        page += 1;
      }
    })(),
    getWorkingPaperSigningItems(token).catch(() => []),
  ]);
  return [...approvals, ...signingItems].sort((a, b) => {
    const dateA = "createdAt" in a ? a.createdAt : a.requestedAt;
    const dateB = "createdAt" in b ? b.createdAt : b.requestedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

export default function InboxPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { token, user } = useAuth();
  const currentUserId = user?.id ?? "";
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
  const [requests, setRequests] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), 10),
  );
  const refreshRequests = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      setRequests(await getAllInboxItems(token));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    skipUrlWrite.current = true;
    const queryStatus = searchParams.get("status");
    const querySearch = searchParams.get("search");
    setTypeFilter(searchParams.get("type") ?? "all");
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);

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
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAllInboxItems(token)
      .then((items) => {
        if (!cancelled) setRequests(items);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

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

  const isMyApproval = useCallback((item: InboxItem): boolean => {
    if (item.requestType === "working_paper") {
      return true;
    }
    const approvalItem = item as ApprovalRequest;
    if (approvalItem.currentStatus !== "pending") return false;
    if (approvalItem.currentApproverUserId) {
      return approvalItem.currentApproverUserId === currentUserId;
    }
    return false;
  }, [currentUserId]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      myApprovals: requests.filter(isMyApproval).length,
      approved: requests.filter(
        (item) =>
          item.requestType !== "working_paper" &&
          (item as ApprovalRequest).currentStatus === "approved",
      ).length,
      rejected: requests.filter(
        (item) =>
          item.requestType !== "working_paper" &&
          (item as ApprovalRequest).currentStatus === "rejected",
      ).length,
    }),
    [requests, isMyApproval],
  );

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

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      if (typeFilter !== "all" && item.requestType !== typeFilter) return false;
      if (filter === "my_approvals") {
        if (!isMyApproval(item)) return false;
      } else if (filter === "approved") {
        if (item.requestType === "working_paper") return false;
        if ((item as ApprovalRequest).currentStatus !== filter) return false;
      } else if (filter === "rejected") {
        if (item.requestType === "working_paper") return false;
        if ((item as ApprovalRequest).currentStatus !== filter) return false;
      }

      // Filter by search
      const keyword = search.trim().toLowerCase();
      if (!keyword) return true;

      if (item.requestType === "working_paper") {
        const wpItem = item as WorkingPaperSigningItem;
        return [
          wpItem.title,
          wpItem.description,
          wpItem.assessmentCycle,
          wpItem.signerPangkat,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(keyword));
      }

      const approvalItem = item as ApprovalRequest;
      return [
        approvalItem.entityCode,
        approvalItem.entityTitle,
        approvalItem.entityOrgName,
        approvalItem.requestedByName,
        approvalItem.currentApproverRole,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword));
    });
  }, [filter, requests, search, typeFilter, isMyApproval]);

  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filteredRequests.length / limit)));
  const paginatedRequests = filteredRequests.slice((visiblePage - 1) * limit, visiblePage * limit);

  if (loading) {
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

      <CollectionTableCard>
        <Table className="min-w-[760px] table-fixed">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[44%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead>Kode</CollectionTableHead>
              <CollectionTableHead className="">Entitas</CollectionTableHead>
              <CollectionTableHead>Jenis</CollectionTableHead>
              <CollectionTableHead title="Waktu pembuatan permintaan">Dibuat</CollectionTableHead>
              <CollectionTableHead>Status</CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <CollectionEmptyState
                    title="Belum ada permintaan persetujuan yang sesuai filter"
                    description="Ubah filter pencarian untuk melihat data lain."
                    className="min-h-24 py-6"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((item) => {
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
                  : approvalItem!.requestedAt;
                const entityId = isWorkingPaper
                  ? wpItem!.workingPaperId
                  : approvalItem!.entityId;

                return (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      {displayCode || `REQ-${item.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="">
                      <div className="min-w-0">
                        <Link
                          href={typeConfig.href(entityId)}
                          className="block min-w-0 truncate text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                        >
                          {displayTitle || "Tanpa judul"}
                        </Link>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {displaySubtitle}
                        </p>
                      </div>
                    </TableCell>
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
                        {formatDate(displayDate)}
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
            page={visiblePage}
            pageSize={limit}
            total={filteredRequests.length}
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
