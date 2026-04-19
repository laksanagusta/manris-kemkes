"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { ApprovalModal } from "@/components/approval-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  { icon: typeof FileText; label: string; href: (id: string, extraId?: string) => string }
> = {
  risk: {
    icon: FileText,
    label: "Risiko",
    href: (id) => `/risk/register/${id}`,
  },
  assessment: {
    icon: FileText,
    label: "Penilaian Risiko",
    href: (id) => `/risk/assessment/${id}`,
  },
  incident: {
    icon: AlertTriangle,
    label: "Insiden",
    href: (id) => `/incidents/${id}`,
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

async function getKRIReportReviewQueue(token: string): Promise<KRIReportReview[]> {
  const response = await api.get<{ id: string; kriId: string; kriName: string; kriMetric: string; riskCode: string; riskTitle: string; periodLabel: string; periodStart: string; periodEnd: string; dueDate: string; value: number | null; notes: string; status: string; submittedByName: string; submittedAt: string }[]>("/kri-reports/review-queue", token);
  return response.map((item) => ({
    ...item,
    requestType: "kri_report" as const,
    status: item.status as "submitted" | "revision_requested",
  }));
}

async function getWorkingPaperSigningItems(token: string): Promise<WorkingPaperSigningItem[]> {
  const response = await api.get<{
    id: string;
    working_paper_id: string;
    title: string;
    description: string;
    assessment_cycle: string;
    sequence_no: number;
    signer_pangkat: string;
    created_at: string;
  }[]>("/working-papers/pending-signing", token);
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
  const { token } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "pending_review" | "pending_approval" | "approved" | "rejected">(() => {
    const value = searchParams.get("status");
    if (value === "all" || value === "approved" || value === "rejected" || value === "pending_review" || value === "pending_approval") {
      return value;
    }
    return "all";
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "risk" | "incident" | "kri_report" | "working_paper">(() => {
    const value = searchParams.get("type");
    return value === "risk" || value === "incident" || value === "kri_report" || value === "working_paper" ? value : "all";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [requests, setRequests] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => parsePositiveInt(searchParams.get("page"), 1));
  const [limit, setLimit] = useState(() => parsePositiveInt(searchParams.get("limit"), 10));
  const [approvalTotal, setApprovalTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "reject">("approve");
  const [selectedApproval, setSelectedApproval] = useState<{
    id: string;
    title: string;
    requestType: string;
    approverRole: string;
  } | null>(null);
  const [kriModalOpen, setKriModalOpen] = useState(false);
  const [kriModalAction, setKriModalAction] = useState<"accept" | "revision">("accept");
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
        [...(approvalsRes.data ?? []), ...kriReports, ...wpSigningItems].sort((a, b) => {
          const dateA = (a as any).requestedAt || (a as any).submittedAt || (a as any).createdAt || (a as any).created_at || 0;
          const dateB = (b as any).requestedAt || (b as any).submittedAt || (b as any).createdAt || (b as any).created_at || 0;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.");
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

    if (queryStatus === "all" || queryStatus === "approved" || queryStatus === "rejected" || queryStatus === "pending_review" || queryStatus === "pending_approval") {
      setFilter(queryStatus);
    } else {
      setFilter("all");
    }
    setTypeFilter(queryType === "risk" || queryType === "incident" || queryType === "kri_report" || queryType === "working_paper" ? queryType : "all");
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
          [...(approvalsRes.data ?? []), ...kriReports, ...wpSigningItems].sort((a, b) => {
            const dateA = (a as any).requestedAt || (a as any).submittedAt || (a as any).createdAt || (a as any).created_at || 0;
            const dateB = (b as any).requestedAt || (b as any).submittedAt || (b as any).createdAt || (b as any).created_at || 0;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          })
        );
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.");
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
  }, [filter, typeFilter, search, page, limit, pathname, router, searchParams, startTransition]);

  const getStatus = (item: InboxItem): string => {
    if (item.requestType === "kri_report") {
      return (item as KRIReportReview).status;
    }
    if (item.requestType === "working_paper") {
      return (item as WorkingPaperSigningItem).status;
    }
    return (item as ApprovalRequest).currentStatus;
  };

  const counts = useMemo(
    () => ({
      all: requests.length,
      pendingReview: requests.filter((item) => {
        if (item.requestType === "kri_report") {
          const kriItem = item as KRIReportReview;
          return kriItem.status === "submitted";
        }
        if (item.requestType === "working_paper") {
          return true; // WP signing items are always pending
        }
        const approvalItem = item as ApprovalRequest;
        return approvalItem.currentStatus === "pending" && approvalItem.currentApproverRole === "reviewer";
      }).length,
      pendingApproval: requests.filter((item) => {
        if (item.requestType === "kri_report") return false;
        if (item.requestType === "working_paper") return false;
        const approvalItem = item as ApprovalRequest;
        return approvalItem.currentStatus === "pending" && approvalItem.currentApproverRole === "pimpinan";
      }).length,
      pending: requests.filter((item) => item.requestType !== "kri_report" && item.requestType !== "working_paper" && (item as ApprovalRequest).currentStatus === "pending").length + requests.filter((item) => item.requestType === "kri_report" && (item as KRIReportReview).status === "submitted").length + requests.filter((item) => item.requestType === "working_paper").length,
      approved: requests.filter((item) => item.requestType !== "kri_report" && item.requestType !== "working_paper" && (item as ApprovalRequest).currentStatus === "approved").length,
      rejected: requests.filter((item) => item.requestType !== "kri_report" && item.requestType !== "working_paper" && (item as ApprovalRequest).currentStatus === "rejected").length,
    }),
    [requests]
  );

  const summaryCards = [
    {
      label: "Total Permintaan",
      value: counts.all,
      tone: "border-border/60 bg-background/60 text-foreground",
    },
    {
      label: "Menunggu Review",
      value: counts.pendingReview,
      tone: "border-risk-medium/20 bg-risk-medium/10 text-risk-medium",
    },
    {
      label: "Menunggu Approval",
      value: counts.pendingApproval,
      tone: "border-blue-200 bg-blue-50 text-blue-700",
    },
    {
      label: "Disetujui",
      value: counts.approved,
      tone: "border-success/20 bg-success/10 text-success",
    },
    {
      label: "Ditolak",
      value: counts.rejected,
      tone: "border-destructive/20 bg-destructive/10 text-destructive",
    },
  ];

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // Filter by status tab
      if (filter === "pending_review") {
        if (item.requestType === "kri_report") {
          const kriItem = item as KRIReportReview;
          if (kriItem.status !== "submitted") return false;
        } else if (item.requestType === "working_paper") {
          // WP signing items always show under "Menunggu Review"
        } else {
          const approvalItem = item as ApprovalRequest;
          if (approvalItem.currentStatus !== "pending" || approvalItem.currentApproverRole !== "reviewer") return false;
        }
      } else if (filter === "pending_approval") {
        if (item.requestType === "kri_report") return false;
        if (item.requestType === "working_paper") return false;
        const approvalItem = item as ApprovalRequest;
        if (approvalItem.currentStatus !== "pending" || approvalItem.currentApproverRole !== "pimpinan") return false;
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
  }, [filter, requests, search, typeFilter]);

  const openApprovalModal = (id: string, title: string, type: "approve" | "reject", reqType: string, approverRole: string) => {
    setSelectedApproval({ id, title, requestType: reqType, approverRole });
    setModalType(type);
    setModalOpen(true);
  };

  const openKRIReportModal = (id: string, title: string, action: "accept" | "revision") => {
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
      const endpoint = kriModalAction === "accept" 
        ? `/kri-reports/${selectedKRIReport.id}/accept`
        : `/kri-reports/${selectedKRIReport.id}/request-revision`;
      
      await api.post(endpoint, kriModalAction === "accept" ? {} : { review_note: kriNote }, token);
      
      toast.success(kriModalAction === "accept" ? "Laporan KRI diterima" : "Permintaan revisi dikirim");
      setKriModalOpen(false);
      refreshRequests();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Gagal memproses aksi");
    } finally {
      setKriSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Memuat daftar persetujuan...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Gagal Memuat Data</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={() => refreshRequests()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approval</h1>
        <p className="text-sm text-muted-foreground">
          Tinjau permintaan persetujuan dengan pola kerja yang sama seperti risk register.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(value) => { setFilter(value as typeof filter); setPage(1); }}>
        <TabsList className="bg-muted/40 border border-border/50">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="pending_review" className="gap-2">
            Menunggu Review
            {counts.pendingReview > 0 && (
              <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
                {counts.pendingReview}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending_approval" className="gap-2">
            Menunggu Approval
            {counts.pendingApproval > 0 && (
              <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
                {counts.pendingApproval}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label} className={cn("border shadow-none", card.tone)}>
            <CardContent className="flex items-end justify-between gap-3 p-4">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                  {card.label}
                </p>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              </div>
              <span className="text-xs text-muted-foreground">jumlah</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari kode, judul, unit, atau pemohon..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 border-none"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(value) => { setTypeFilter(value as typeof typeFilter); setPage(1); }}
            >
              <SelectTrigger className="h-8 w-40 text-xs bg-muted/30 border-none">
                <SelectValue placeholder="Jenis Permintaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="risk">Risiko</SelectItem>
                <SelectItem value="incident">Insiden</SelectItem>
                <SelectItem value="kri_report">Laporan KRI</SelectItem>
                <SelectItem value="working_paper">Kertas Kerja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

       <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
         <Table>
           <TableHeader>
             <TableRow className="border-border/50 hover:bg-transparent">
               <TableHead className="w-24 whitespace-nowrap">Kode</TableHead>
               <TableHead className="whitespace-nowrap">Entitas</TableHead>
               <TableHead className="w-32 whitespace-nowrap">Unit Kerja</TableHead>
               <TableHead className="w-24 whitespace-nowrap">Jenis</TableHead>
               <TableHead className="w-36 whitespace-nowrap">Pemohon</TableHead>
               <TableHead className="w-32 whitespace-nowrap">Tanggal</TableHead>
               <TableHead className="w-28 whitespace-nowrap">Status</TableHead>
               <TableHead className="w-28 text-right whitespace-nowrap">Tindakan</TableHead>
             </TableRow>
           </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                  Belum ada permintaan persetujuan yang sesuai filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((item) => {
                const typeConfig = requestTypeConfig[item.requestType] ?? requestTypeConfig.risk;
                const Icon = typeConfig.icon;
                const status = getStatus(item);
                const isKRIReport = item.requestType === "kri_report";
                const isWorkingPaper = item.requestType === "working_paper";
                const kriItem = isKRIReport ? item as KRIReportReview : null;
                const wpItem = isWorkingPaper ? item as WorkingPaperSigningItem : null;
                const approvalItem = !isKRIReport && !isWorkingPaper ? item as ApprovalRequest : null;
                const isRisk = item.requestType === "risk";
const canAction = isKRIReport 
  ? kriItem!.status === "submitted" 
  : isWorkingPaper
    ? false
    : (approvalItem!.currentStatus === "pending" && !isRisk);

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
                    ? `Penandatangan #${wpItem!.sequenceNo} (${wpItem!.signerPangkat})`
                    : (approvalItem!.notes || `Menunggu review ${approvalItem!.currentApproverRole}`);
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
                  <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="font-mono text-muted-foreground truncate max-w-[100px]">
                      {displayCode || `REQ-${item.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                       <div className="min-w-0">
                         <Link
                           href={typeConfig.href(entityId, extraId)}
                           className="block truncate text-sm font-medium leading-relaxed text-primary transition-colors hover:text-primary/80"
                         >
                           {displayTitle || "Tanpa judul"}
                         </Link>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {displaySubtitle}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[150px]">
                      {displayOrg || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="size-3" />
                          {typeConfig.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{displayRequester || "System"}</p>
                        {!isKRIReport && !isWorkingPaper && (
                          <p className="mt-0.5 text-sm text-muted-foreground capitalize">
                            Approver: {approvalItem!.currentApproverRole || "-"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {formatDate(displayDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "h-5 px-1.5 text-[10px] font-medium border",
                          statusVariant[status]
                        )}
                      >
                        {statusLabel[status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {isWorkingPaper ? (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 gap-1.5 px-2 text-xs"
                          >
                            <Link href={`/risk/working-papers/${wpItem!.workingPaperId}`}>
                              <FileSignature className="size-3" />
                              Tanda Tangan
                            </Link>
                          </Button>
                        ) : canAction ? (
                          isKRIReport ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  openKRIReportModal(
                                    kriItem!.id,
                                    kriItem!.kriName,
                                    "accept"
                                  )
                                }
                                className="h-7 gap-1.5 px-2 text-xs"
                              >
                                <Check className="size-3" />
                                Terima
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openKRIReportModal(
                                    kriItem!.id,
                                    kriItem!.kriName,
                                    "revision"
                                  )
                                }
                                className="h-7 gap-1.5 px-2 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                              >
                                <AlertCircle className="size-3" />
                                Revisi
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  openApprovalModal(
                                    item.id,
                                    displayTitle || "Tanpa judul",
                                    "approve",
                                    item.requestType,
                                    approvalItem!.currentApproverRole
                                  )
                                }
                                className="h-7 gap-1.5 px-2 text-xs"
                              >
                                <Check className="size-3" />
                                Setuju
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openApprovalModal(
                                    item.id,
                                    displayTitle || "Tanpa judul",
                                    "reject",
                                    item.requestType,
                                    approvalItem!.currentApproverRole
                                  )
                                }
                                className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="size-3" />
                                Tolak
                              </Button>
                            </>
                          )
                        ) : (
                          <span className="px-2 text-[10px] text-muted-foreground">
                            {isKRIReport ? "Menunggu review" : isRisk ? "Klik judul untuk review" : "Tidak ada aksi"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan {approvalTotal === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, approvalTotal)} dari {approvalTotal} permintaan persetujuan
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              disabled={page === 1 || loading || isPending}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 text-xs font-medium text-primary">
              {page}
            </span>
            <span className="text-xs text-muted-foreground">
              dari {Math.ceil(approvalTotal / limit) || 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              disabled={
                page >= (Math.ceil(approvalTotal / limit) || 1) ||
                approvalTotal === 0 ||
                loading ||
                isPending
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(Math.ceil(approvalTotal / limit) || 1, current + 1),
                )
              }
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <ApprovalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        approvalId={selectedApproval?.id || null}
        approvalType={modalType}
        entityTitle={selectedApproval?.title}
        requestType={selectedApproval?.requestType}
        approverRole={selectedApproval?.approverRole}
        onSuccess={() => refreshRequests()}
        token={token || undefined}
      />

      <Dialog open={kriModalOpen} onOpenChange={setKriModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {kriModalAction === "accept" ? "Terima Laporan KRI" : "Minta Revisi Laporan KRI"}
            </DialogTitle>
            <DialogDescription>
              {kriModalAction === "accept"
                ? `Terima laporan "${selectedKRIReport?.title}"? Nilai akan diperbarui secara otomatis.`
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
            <Button variant="outline" onClick={() => setKriModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleKRIReportAction}
              disabled={kriSubmitting || (kriModalAction === "revision" && !kriNote.trim())}
              className={kriModalAction === "revision" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              {kriSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {kriModalAction === "accept" ? "Terima" : "Kirim Permintaan Revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
