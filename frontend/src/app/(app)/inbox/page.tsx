"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Check,
  Clock,
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

type InboxItem = ApprovalRequest | KRIReportReview;

const statusVariant: Record<string, string> = {
  pending: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
  submitted: "bg-amber-100 text-amber-700 border-amber-200",
  revision_requested: "bg-orange-100 text-orange-700 border-orange-200",
};

const statusLabel: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  submitted: "Menunggu Review",
  revision_requested: "Revisi Diminta",
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
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function getApprovalRequests(token: string) {
  return api.get<ApprovalRequest[]>("/approvals?status=all", token);
}

async function getKRIReportReviewQueue(token: string): Promise<KRIReportReview[]> {
  const response = await api.get<{ id: string; kriId: string; kriName: string; kriMetric: string; riskCode: string; riskTitle: string; periodLabel: string; periodStart: string; periodEnd: string; dueDate: string; value: number | null; notes: string; status: string; submittedByName: string; submittedAt: string }[]>("/kri-reports/review-queue", token);
  return response.map((item) => ({
    ...item,
    requestType: "kri_report" as const,
    status: item.status as "submitted" | "revision_requested",
  }));
}

export default function InboxPage() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [filter, setFilter] = useState<"all" | ApprovalRequest["currentStatus"]>(() => {
    const value = searchParams.get("status");
    return value === "all" || value === "approved" || value === "rejected" ? value : "pending";
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "risk" | "incident" | "kri_report">(() => {
    const value = searchParams.get("type");
    return value === "risk" || value === "incident" || value === "kri_report" ? value : "all";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [requests, setRequests] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "reject">("approve");
  const [selectedApproval, setSelectedApproval] = useState<{
    id: string;
    title: string;
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
      const [approvals, kriReports] = await Promise.all([
        getApprovalRequests(token),
        getKRIReportReviewQueue(token),
      ]);
      setRequests([...approvals, ...kriReports]);
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

    setFilter(queryStatus === "all" || queryStatus === "approved" || queryStatus === "rejected" ? queryStatus : "pending");
    setTypeFilter(queryType === "risk" || queryType === "incident" || queryType === "kri_report" ? queryType : "all");
    setSearch(querySearch ?? "");
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
        const [approvals, kriReports] = await Promise.all([
          getApprovalRequests(token),
          getKRIReportReviewQueue(token),
        ]);
        setRequests([...approvals, ...kriReports]);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.");
      } finally {
        setLoading(false);
      }
    };

    void loadRequests();
  }, [token]);

  const getStatus = (item: InboxItem): string => {
    return item.requestType === "kri_report" ? item.status : item.currentStatus;
  };

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((item) => item.requestType !== "kri_report" && item.currentStatus === "pending").length + requests.filter((item) => item.requestType === "kri_report" && item.status === "submitted").length,
      approved: requests.filter((item) => item.requestType !== "kri_report" && item.currentStatus === "approved").length,
      rejected: requests.filter((item) => item.requestType !== "kri_report" && item.currentStatus === "rejected").length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const status = getStatus(item);
      if (filter !== "all") {
        if (item.requestType === "kri_report") {
          if (filter === "pending" && item.status !== "submitted") return false;
          if (filter !== "pending") return false;
        } else {
          if (item.currentStatus !== filter) return false;
        }
      }
      if (typeFilter !== "all" && item.requestType !== typeFilter) return false;

      const keyword = search.trim().toLowerCase();
      if (!keyword) return true;

      if (item.requestType === "kri_report") {
        return [
          item.kriName,
          item.riskCode,
          item.riskTitle,
          item.periodLabel,
          item.submittedByName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(keyword));
      }

      return [
        item.entityCode,
        item.entityTitle,
        item.entityOrgName,
        item.requestedByName,
        item.currentApproverRole,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword));
    });
  }, [filter, requests, search, typeFilter]);

  const openApprovalModal = (id: string, title: string, type: "approve" | "reject") => {
    setSelectedApproval({ id, title });
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

      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        <TabsList className="bg-muted/40 border border-border/50">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Menunggu
            {counts.pending > 0 && (
              <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs font-medium border">
          Total: {counts.all}
        </Badge>
        <Badge className={cn("text-xs font-medium border", statusVariant.pending)}>
          Menunggu: {counts.pending}
        </Badge>
        <Badge className={cn("text-xs font-medium border", statusVariant.approved)}>
          Disetujui: {counts.approved}
        </Badge>
        <Badge className={cn("text-xs font-medium border", statusVariant.rejected)}>
          Ditolak: {counts.rejected}
        </Badge>
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
              onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}
            >
              <SelectTrigger className="h-8 w-40 text-xs bg-muted/30 border-none">
                <SelectValue placeholder="Jenis Permintaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="risk">Risiko</SelectItem>
                <SelectItem value="incident">Insiden</SelectItem>
                <SelectItem value="kri_report">Laporan KRI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-24 text-xs">Kode</TableHead>
              <TableHead className="text-xs">Entitas</TableHead>
              <TableHead className="w-32 text-xs">Unit Kerja</TableHead>
              <TableHead className="w-24 text-xs">Jenis</TableHead>
              <TableHead className="w-36 text-xs">Pemohon</TableHead>
              <TableHead className="w-32 text-xs">Tanggal</TableHead>
              <TableHead className="w-28 text-xs">Status</TableHead>
              <TableHead className="w-28 text-xs text-right">Tindakan</TableHead>
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
                const canAction = isKRIReport ? item.status === "submitted" : item.currentStatus === "pending";

                const kriItem = isKRIReport ? item as KRIReportReview : null;
                const approvalItem = !isKRIReport ? item as ApprovalRequest : null;

                const displayCode = isKRIReport ? kriItem!.riskCode : approvalItem!.entityCode;
                const displayTitle = isKRIReport ? kriItem!.kriName : approvalItem!.entityTitle;
                const displaySubtitle = isKRIReport
                  ? `${kriItem!.periodLabel} • Nilai: ${kriItem!.value !== null ? kriItem!.value : "—"} ${kriItem!.kriMetric || ""}`
                  : (approvalItem!.notes || `Menunggu review ${approvalItem!.currentApproverRole}`);
                const displayOrg = isKRIReport ? kriItem!.riskTitle : approvalItem!.entityOrgName;
                const displayRequester = isKRIReport ? kriItem!.submittedByName : approvalItem!.requestedByName;
                const displayDate = isKRIReport ? kriItem!.submittedAt : approvalItem!.requestedAt;
                const entityId = isKRIReport ? kriItem!.id : approvalItem!.entityId;
                const extraId = isKRIReport ? kriItem!.kriId : undefined;

                return (
                  <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                      {displayCode || `REQ-${item.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="min-w-0">
                        <Link
                          href={typeConfig.href(entityId, extraId)}
                          className="block truncate text-xs font-medium leading-relaxed text-primary transition-colors hover:text-primary/80 hover:underline"
                        >
                          {displayTitle || "Tanpa judul"}
                        </Link>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {displaySubtitle}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {displayOrg || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1">
                          <Icon className="size-3" />
                          {typeConfig.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{displayRequester || "System"}</p>
                        {!isKRIReport && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">
                            Approver: {approvalItem!.currentApproverRole || "-"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
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
                        {canAction ? (
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
                                    "approve"
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
                                    "reject"
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
                            {isKRIReport ? "Menunggu review" : "Tidak ada aksi"}
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
            Menampilkan {filteredRequests.length} dari {requests.length} permintaan persetujuan
          </p>
          <p className="text-xs text-muted-foreground">
            Fokus utama: {counts.pending} item masih menunggu keputusan
          </p>
        </div>
      </Card>

      <ApprovalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        approvalId={selectedApproval?.id || null}
        approvalType={modalType}
        entityTitle={selectedApproval?.title}
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
