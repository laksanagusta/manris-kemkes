"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Check,
  ClipboardCheck,
  Clock,
  FileSignature,
  FileText,
  X,
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
} from "@/components/shared/design-system";
import {
  ActionButton,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import { KpiCard } from "@/components/ui/kpi-card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface KRIReportReview {
  id: string;
  requestType: "kri_report";
  kriId: string;
  kriName: string;
  kriMetric: string;
  riskCode: string;
  riskTitle: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  value: number | null;
  notes: string;
  status: "submitted" | "revision_requested";
  submittedByName: string;
  submittedAt: string;
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

type InboxItem = ApprovalRequest | KRIReportReview | WorkingPaperSigningItem;

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
  kri_report: {
    icon: BarChart3,
    label: "Laporan KRI",
    href: (id, kriId) => `/compliance/kri/${kriId}`,
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

async function getKRIReportReviewQueue(
  token: string,
): Promise<KRIReportReview[]> {
  const response = await api.get<
    {
      id: string;
      kriId: string;
      kriName: string;
      kriMetric: string;
      riskCode: string;
      riskTitle: string;
      periodLabel: string;
      periodStart: string;
      periodEnd: string;
      dueDate: string;
      value: number | null;
      notes: string;
      status: string;
      submittedByName: string;
      submittedAt: string;
    }[]
  >("/kri-reports/review-queue", token);
  return response.map((item) => ({
    ...item,
    requestType: "kri_report" as const,
    status: item.status as "submitted" | "revision_requested",
  }));
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
    "all" | "risk" | "kri_report" | "working_paper"
  >(() => {
    const value = searchParams.get("type");
    return value === "risk" ||
      value === "kri_report" ||
      value === "working_paper"
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<{
    id: string;
    title: string;
    requestType: string;
    approverRole: string;
  } | null>(null);
  const [kriModalOpen, setKriModalOpen] = useState(false);
  const [kriModalAction, setKriModalAction] = useState<"accept" | "revision">(
    "accept",
  );
  const [selectedKRIReport, setSelectedKRIReport] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [kriNote, setKriNote] = useState("");
  const [kriSubmitting, setKriSubmitting] = useState(false);

  const refreshRequests = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [approvalsRes, kriReports, wpSigningItems] = await Promise.all([
        getApprovalRequests(token, { status: "all", page, limit }),
        getKRIReportReviewQueue(token),
        getWorkingPaperSigningItems(token).catch(() => []),
      ]);
      setApprovalTotal(approvalsRes.total ?? 0);
      setPage(approvalsRes.page ?? page);
      setLimit(approvalsRes.limit ?? limit);
      setRequests(
        [...(approvalsRes.data ?? []), ...kriReports, ...wpSigningItems].sort(
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
      queryType === "risk" ||
        queryType === "kri_report" ||
        queryType === "working_paper"
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
        const [approvalsRes, kriReports, wpSigningItems] = await Promise.all([
          getApprovalRequests(token, { status: "all", page, limit }),
          getKRIReportReviewQueue(token),
          getWorkingPaperSigningItems(token).catch(() => []),
        ]);
        setApprovalTotal(approvalsRes.total ?? 0);
        setPage(approvalsRes.page ?? page);
        setLimit(approvalsRes.limit ?? limit);
        setRequests(
          [...(approvalsRes.data ?? []), ...kriReports, ...wpSigningItems].sort(
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
    if (item.requestType === "kri_report") {
      return (item as KRIReportReview).status;
    }
    if (item.requestType === "working_paper") {
      return (item as WorkingPaperSigningItem).status;
    }
    return (item as ApprovalRequest).currentStatus;
  };

  const isMyApproval = (item: InboxItem): boolean => {
    if (item.requestType === "kri_report") {
      return (item as KRIReportReview).status === "submitted";
    }
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
          item.requestType !== "kri_report" &&
          item.requestType !== "working_paper" &&
          (item as ApprovalRequest).currentStatus === "approved",
      ).length,
      rejected: requests.filter(
        (item) =>
          item.requestType !== "kri_report" &&
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
        if (item.requestType === "kri_report") return false;
        if (item.requestType === "working_paper") return false;
        if ((item as ApprovalRequest).currentStatus !== filter) return false;
      } else if (filter === "rejected") {
        if (item.requestType === "kri_report") return false;
        if (item.requestType === "working_paper") return false;
        if ((item as ApprovalRequest).currentStatus !== filter) return false;
      }

      // Filter by type
      if (typeFilter !== "all" && item.requestType !== typeFilter) return false;

      // Filter by search
      const keyword = search.trim().toLowerCase();
      if (!keyword) return true;

      if (item.requestType === "kri_report") {
        const kriItem = item as KRIReportReview;
        return [
          kriItem.kriName,
          kriItem.riskCode,
          kriItem.riskTitle,
          kriItem.periodLabel,
          kriItem.submittedByName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(keyword));
      }

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

  const openApprovalModal = (
    id: string,
    title: string,
    type: "approve" | "reject",
    reqType: string,
    approverRole: string,
  ) => {
    setSelectedApproval({ id, title, requestType: reqType, approverRole });
    setReviewMessage("");
    setReviewModalOpen(true);
  };

  const openKRIReportModal = (
    id: string,
    title: string,
    action: "accept" | "revision",
  ) => {
    setSelectedKRIReport({ id, title });
    setKriModalAction(action);
    setKriNote("");
    setKriModalOpen(true);
  };

  const handleKRIReportAction = async () => {
    if (!token || !selectedKRIReport) return;

    if (kriModalAction === "revision" && !kriNote.trim()) {
      return;
    }

    try {
      setKriSubmitting(true);
      const endpoint =
        kriModalAction === "accept"
          ? `/kri-reports/${selectedKRIReport.id}/accept`
          : `/kri-reports/${selectedKRIReport.id}/request-revision`;

      await api.post(
        endpoint,
        kriModalAction === "accept" ? {} : { review_note: kriNote },
        token,
      );

      toast.success(
        kriModalAction === "accept"
          ? "Laporan KRI diterima"
          : "Permintaan revisi dikirim",
      );
      setKriModalOpen(false);
      refreshRequests();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Gagal memproses aksi");
    } finally {
      setKriSubmitting(false);
    }
  };

  const handleReviewAction = async (action: "approve" | "reject") => {
    if (!token || !selectedApproval) return;

    try {
      setReviewSubmitting(true);
      await api.post(
        `/approvals/${selectedApproval.id}/action`,
        { action, comments: reviewMessage },
        token,
      );
      toast.success(
        action === "approve"
          ? "Persetujuan berhasil disimpan"
          : "Penolakan berhasil disimpan",
      );
      setReviewModalOpen(false);
      refreshRequests();
    } catch (error) {
      console.error("Failed to process approval action:", error);
      toast.error(
        action === "approve"
          ? "Gagal menyimpan persetujuan"
          : "Gagal menyimpan penolakan",
        {
          description:
            error instanceof Error ? error.message : "Terjadi kesalahan",
        },
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

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
        description="Tinjau, setujui, dan tindak lanjuti permintaan yang masuk."
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
            className="flex min-h-[96px] flex-col rounded-lg ring-1 ring-inset ring-border p-4"
            labelClassName="capitalize tracking-normal"
            valueClassName="font-medium"
            valueWrapClassName="mt-auto"
          />
        ))}
      </MetricGrid>

      <CollectionToolbar
        actions={
          <>
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
            <SelectTrigger className="h-9 w-40 border-0 bg-muted/50 text-sm">
              <SelectValue placeholder="Jenis Permintaan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="risk">Risiko</SelectItem>
              <SelectItem value="kri_report">Laporan KRI</SelectItem>
              <SelectItem value="working_paper">Kertas Kerja</SelectItem>
            </SelectContent>
          </Select>
          </>
        }
      />

      <CollectionTableCard>
        {filteredRequests.length === 0 ? (
          <CollectionEmptyState
            title="Belum ada permintaan persetujuan yang sesuai filter"
            description="Ubah filter pencarian atau jenis permintaan untuk melihat data lain."
          />
        ) : (
          <Table className="min-w-[1120px] table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[26%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
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
                  Unit Kerja
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Jenis
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Pemohon
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Tanggal
                </CollectionTableHead>
                <CollectionTableHead className="px-3">
                  Status
                </CollectionTableHead>
                <CollectionTableHead className="px-3 text-right">
                  Tindakan
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {filteredRequests.map((item) => {
                const typeConfig =
                  requestTypeConfig[item.requestType] ?? requestTypeConfig.risk;
                const Icon = typeConfig.icon;
                const status = getStatus(item);
                const isKRIReport = item.requestType === "kri_report";
                const isWorkingPaper = item.requestType === "working_paper";
                const kriItem = isKRIReport ? (item as KRIReportReview) : null;
                const wpItem = isWorkingPaper
                  ? (item as WorkingPaperSigningItem)
                  : null;
                const approvalItem =
                  !isKRIReport && !isWorkingPaper
                    ? (item as ApprovalRequest)
                    : null;
                const isRisk = item.requestType === "risk";
                const canAction = isKRIReport
                  ? kriItem!.status === "submitted"
                  : isWorkingPaper
                    ? false
                    : approvalItem!.currentStatus === "pending" && !isRisk;

                const displayCode = isKRIReport
                  ? kriItem!.riskCode
                  : isWorkingPaper
                    ? `KK-${wpItem!.workingPaperId.slice(0, 6)}`
                    : approvalItem!.entityCode;
                const displayTitle = isKRIReport
                  ? kriItem!.kriName
                  : isWorkingPaper
                    ? wpItem!.title
                    : approvalItem!.entityTitle;
                const displaySubtitle = isKRIReport
                  ? `${kriItem!.periodLabel} • Nilai: ${kriItem!.value !== null ? kriItem!.value : "—"} ${kriItem!.kriMetric || ""}`
                  : isWorkingPaper
                    ? wpItem!.signerPangkat
                      ? `Penandatangan #${wpItem!.sequenceNo} (${wpItem!.signerPangkat})`
                      : `Penandatangan #${wpItem!.sequenceNo}`
                    : approvalItem!.notes ||
                      `Menunggu review ${approvalItem!.currentApproverRole}`;
                const displayOrg = isKRIReport
                  ? kriItem!.riskTitle
                  : isWorkingPaper
                    ? wpItem!.assessmentCycle || "—"
                    : approvalItem!.entityOrgName;
                const displayRequester = isKRIReport
                  ? kriItem!.submittedByName
                  : isWorkingPaper
                    ? "Sistem"
                    : approvalItem!.requestedByName;
                const displayDate = isKRIReport
                  ? kriItem!.submittedAt
                  : isWorkingPaper
                    ? wpItem!.createdAt
                    : approvalItem!.requestedAt;
                const entityId = isKRIReport
                  ? kriItem!.id
                  : isWorkingPaper
                    ? wpItem!.workingPaperId
                    : approvalItem!.entityId;
                const extraId = isKRIReport ? kriItem!.kriId : undefined;

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
                          href={typeConfig.href(entityId, extraId)}
                          className="block min-w-0 truncate text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                        >
                          {displayTitle || "Tanpa judul"}
                        </Link>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {displaySubtitle}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">
                      {displayOrg || "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="size-3" />
                          {typeConfig.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {displayRequester || "System"}
                        </p>
                        {!isKRIReport && !isWorkingPaper && (
                          <p className="mt-0.5 text-sm text-muted-foreground capitalize">
                            Approver: {approvalItem!.currentApproverRole || "-"}
                          </p>
                        )}
                      </div>
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
                    <TableCell className="py-2 pl-3 pr-4 text-right">
                      {isWorkingPaper ? (
                        <ActionButton
                          size="sm"
                          asChild
                          className="h-7 px-2 text-xs"
                        >
                          <Link
                            href={`/risk/working-papers/${wpItem!.workingPaperId}`}
                          >
                            <FileSignature className="size-3" />
                            Tanda Tangan
                          </Link>
                        </ActionButton>
                      ) : canAction ? (
                        isKRIReport ? (
                          <div className="inline-flex gap-1">
                            <ActionButton
                              size="sm"
                              onClick={() =>
                                openKRIReportModal(
                                  kriItem!.id,
                                  kriItem!.kriName,
                                  "accept",
                                )
                              }
                              className="h-7 px-2 text-xs"
                              icon={<Check className="size-3" />}
                            >
                              Setujui
                            </ActionButton>
                            <ActionButton
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openKRIReportModal(
                                  kriItem!.id,
                                  kriItem!.kriName,
                                  "revision",
                                )
                              }
                              className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                              icon={<AlertCircle className="size-3" />}
                            >
                              Revisi
                            </ActionButton>
                          </div>
                        ) : (
                          <ActionButton
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openApprovalModal(
                                item.id,
                                displayTitle || "Tanpa judul",
                                "approve",
                                item.requestType,
                                approvalItem!.currentApproverRole,
                              )
                            }
                            className="h-7 px-2.5 text-xs"
                            icon={<ClipboardCheck className="size-3" />}
                          >
                            Tinjau
                          </ActionButton>
                        )
                      ) : (
                        <span className="px-2 text-[10px] text-muted-foreground">
                          {isKRIReport
                            ? "Menunggu review"
                            : isRisk
                              ? "Klik judul untuk review"
                              : "Tidak ada aksi"}
                        </span>
                      )}
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

      <Dialog open={kriModalOpen} onOpenChange={setKriModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  kriModalAction === "accept"
                    ? "bg-primary/15 text-primary"
                    : "bg-orange-500/15 text-orange-600",
                )}
              >
                {kriModalAction === "accept" ? (
                  <Check className="size-4" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
              </div>
              <DialogTitle>
                {kriModalAction === "accept"
                  ? "Setujui Laporan KRI"
                  : "Minta Revisi Laporan KRI"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {kriModalAction === "accept"
                ? `Setujui laporan "${selectedKRIReport?.title}"? Nilai akan diperbarui secara otomatis.`
                : `Minta revisi untuk laporan "${selectedKRIReport?.title}". Unit pelapor dapat mengirim ulang setelah revisi.`}
            </DialogDescription>
          </DialogHeader>

          {kriModalAction === "revision" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan Revisi</label>
              <Textarea
                value={kriNote}
                onChange={(e) => setKriNote(e.target.value)}
                placeholder="Jelaskan apa yang perlu direvisi..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <ActionButton variant="outline" onClick={() => setKriModalOpen(false)}>
              Batal
            </ActionButton>
            <ActionButton
              onClick={handleKRIReportAction}
              disabled={
                kriSubmitting ||
                (kriModalAction === "revision" && !kriNote.trim())
              }
              variant={kriModalAction === "revision" ? "outline" : "default"}
              className={
                kriModalAction === "revision"
                  ? "border-orange-500/20 bg-orange-600 text-white hover:bg-orange-700"
                  : ""
              }
              loading={kriSubmitting}
            >
              {kriModalAction === "accept"
                ? "Setujui"
                : "Kirim Permintaan Revisi"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedApproval?.approverRole === "reviewer"
                ? "Tinjau Pemantauan"
                : "Beri Persetujuan"}
            </DialogTitle>
            <DialogDescription>
              Berikan keputusan persetujuan atau penolakan untuk item ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Tambahkan pesan persetujuan atau alasan penolakan..."
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value)}
              disabled={reviewSubmitting}
              className="min-h-[80px] resize-none"
            />
            <div className="flex gap-2 pt-2">
              <ActionButton
                variant="outline"
                onClick={() => handleReviewAction("reject")}
                disabled={reviewSubmitting}
                className="flex-1 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
                icon={reviewSubmitting ? undefined : <X className="size-4" />}
                loading={reviewSubmitting}
              >
                Tolak
              </ActionButton>
              <ActionButton
                onClick={() => handleReviewAction("approve")}
                disabled={reviewSubmitting}
                className="flex-1"
                loading={reviewSubmitting}
                icon={reviewSubmitting ? undefined : <Check className="size-4" />}
              >
                Setujui
              </ActionButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
