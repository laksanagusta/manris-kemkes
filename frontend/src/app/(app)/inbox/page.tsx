"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  FileSignature,
  FileText,
} from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";
import {
  CollectionPagination,
  CollectionPageHeader,
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionTabsList,
  CollectionTabsTrigger,
  CollectionToolbar,
  KpiCard,
} from "@/components/shared/design-system";
import {
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

const statusVariant: Record<string, string> = {
  pending: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
  submitted: "bg-amber-100 text-amber-700 border-amber-200",
  revision_requested: "bg-orange-100 text-orange-700 border-orange-200",
  pending_signing: "bg-blue-100 text-blue-700 border-blue-200",
};

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

export default function InboxPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { token, user } = useAuth();
  const currentUserId = user?.id ?? "";
  const [isPending, startTransition] = useTransition();
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
  const [typeFilter, setTypeFilter] = useState<
    "all" | "risk" | "working_paper"
  >(() => {
    const value = searchParams.get("type");
    return value === "risk" || value === "working_paper"
      ? value
      : "all";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [requests, setRequests] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), 10),
  );
  const [approvalTotal, setApprovalTotal] = useState(0);
  const refreshRequests = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [approvalsRes, wpSigningItems] = await Promise.all([
        getApprovalRequests(token, { status: "all", page, limit }),
        getWorkingPaperSigningItems(token).catch(() => []),
      ]);
      setApprovalTotal(approvalsRes.total ?? 0);
      setPage(approvalsRes.page ?? page);
      setLimit(approvalsRes.limit ?? limit);
      setRequests(
        [...(approvalsRes.data ?? []), ...wpSigningItems].sort(
          (a, b) => {
            const dateA =
              (a as any).requestedAt ||
              (a as any).submittedAt ||
              (a as any).createdAt ||
              (a as any).created_at ||
              0;
            const dateB =
              (b as any).requestedAt ||
              (b as any).submittedAt ||
              (b as any).createdAt ||
              (b as any).created_at ||
              0;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          },
        ),
      );
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
    const queryStatus = searchParams.get("status");
    const queryType = searchParams.get("type");
    const querySearch = searchParams.get("search");
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
    setTypeFilter(
      queryType === "risk" || queryType === "working_paper"
        ? queryType
        : "all",
    );
    setSearch(querySearch ?? "");
    setPage((current) => (current === nextPage ? current : nextPage));
    setLimit((current) => (current === nextLimit ? current : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const [approvalsRes, wpSigningItems] = await Promise.all([
          getApprovalRequests(token, { status: "all", page, limit }),
          getWorkingPaperSigningItems(token).catch(() => []),
        ]);
        setApprovalTotal(approvalsRes.total ?? 0);
        setPage(approvalsRes.page ?? page);
        setLimit(approvalsRes.limit ?? limit);
        setRequests(
          [...(approvalsRes.data ?? []), ...wpSigningItems].sort(
            (a, b) => {
              const dateA =
                (a as any).requestedAt ||
                (a as any).submittedAt ||
                (a as any).createdAt ||
                (a as any).created_at ||
                0;
              const dateB =
                (b as any).requestedAt ||
                (b as any).submittedAt ||
                (b as any).createdAt ||
                (b as any).created_at ||
                0;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            },
          ),
        );
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat daftar persetujuan.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadRequests();
  }, [token, page, limit]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (filter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", filter);
    }

    if (typeFilter === "all") {
      nextParams.delete("type");
    } else {
      nextParams.set("type", typeFilter);
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
    typeFilter,
    search,
    page,
    limit,
    pathname,
    router,
    startTransition,
  ]);

  const getStatus = (item: InboxItem): string => {
    if (item.requestType === "working_paper") {
      return (item as WorkingPaperSigningItem).status;
    }
    return (item as ApprovalRequest).currentStatus;
  };

  const isMyApproval = (item: InboxItem): boolean => {
    if (item.requestType === "working_paper") {
      return true;
    }
    const approvalItem = item as ApprovalRequest;
    if (approvalItem.currentStatus !== "pending") return false;
    if (approvalItem.currentApproverUserId) {
      return approvalItem.currentApproverUserId === currentUserId;
    }
    return false;
  };

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
    [requests, currentUserId],
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
      if (filter === "my_approvals") {
        if (!isMyApproval(item)) return false;
      } else if (filter === "approved") {
        if (item.requestType === "working_paper") return false;
        if ((item as ApprovalRequest).currentStatus !== filter) return false;
      } else if (filter === "rejected") {
        if (item.requestType === "working_paper") return false;
        if ((item as ApprovalRequest).currentStatus !== filter) return false;
      }

      // Filter by type
      if (typeFilter !== "all" && item.requestType !== typeFilter) return false;

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
  }, [filter, requests, search, typeFilter, currentUserId]);

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

      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value as typeof filter);
          setPage(1);
        }}
      >
        <CollectionTabsList>
          <CollectionTabsTrigger value="all">
            Semua
          </CollectionTabsTrigger>
          <CollectionTabsTrigger value="my_approvals">
            Persetujuan Saya
            {counts.myApprovals > 0 && (
              <Badge className="ml-1 h-4 bg-primary/20 px-1 text-[9px] text-primary">
                {counts.myApprovals}
              </Badge>
            )}
          </CollectionTabsTrigger>
          <CollectionTabsTrigger value="approved">
            Disetujui
          </CollectionTabsTrigger>
          <CollectionTabsTrigger value="rejected">
            Ditolak
          </CollectionTabsTrigger>
        </CollectionTabsList>
      </Tabs>

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

      <CollectionToolbar
        leading={
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <CollectionSearchField
              placeholder="Cari kode, judul, unit, atau pemohon..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Cari permintaan persetujuan"
            />
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as typeof typeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full bg-muted/50 text-sm sm:w-40">
                <SelectValue placeholder="Jenis Permintaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="risk">Risiko</SelectItem>
                <SelectItem value="working_paper">Kertas Kerja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <CollectionTableCard>
        {filteredRequests.length === 0 ? (
          <CollectionEmptyState
            title="Belum ada permintaan persetujuan yang sesuai filter"
            description="Ubah filter pencarian atau jenis permintaan untuk melihat data lain."
          />
        ) : (
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
                <CollectionTableHead className="pl-4 pr-3">
                  Kode
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Entitas
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Jenis
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Tanggal
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Status
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {filteredRequests.map((item) => {
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
                  <TableRow
                    key={item.id}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <TableCell className="py-2 pl-4 pr-3 text-foreground">
                      {displayCode || `REQ-${item.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="px-3 py-2">
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
                    <TableCell className="px-3 py-2">
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="size-3" />
                          {typeConfig.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {formatDate(displayDate)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge
                        className={cn(
                          "h-5 px-1.5 text-[10px] font-medium",
                          statusVariant[status],
                        )}
                      >
                        {statusLabel[status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

          <CollectionPagination
            itemLabel="permintaan persetujuan"
            page={page}
            pageSize={limit}
            total={approvalTotal}
            disabled={loading || isPending}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
      </CollectionTableCard>

    </PageStack>
  );
}
