"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
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
  notes?: string;
}

const statusVariant: Record<ApprovalRequest["currentStatus"], string> = {
  pending: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

const statusLabel: Record<ApprovalRequest["currentStatus"], string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const requestTypeConfig: Record<
  string,
  { icon: typeof FileText; label: string; href: (id: string) => string }
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

export default function InboxPage() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [filter, setFilter] = useState<"all" | ApprovalRequest["currentStatus"]>(() => {
    const value = searchParams.get("status");
    return value === "all" || value === "approved" || value === "rejected" ? value : "pending";
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "risk" | "incident">(() => {
    const value = searchParams.get("type");
    return value === "risk" || value === "incident" ? value : "all";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "reject">("approve");
  const [selectedApproval, setSelectedApproval] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const refreshRequests = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getApprovalRequests(token);
      setRequests(data);
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
    setTypeFilter(queryType === "risk" || queryType === "incident" ? queryType : "all");
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
        const data = await getApprovalRequests(token);
        setRequests(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat daftar persetujuan.");
      } finally {
        setLoading(false);
      }
    };

    void loadRequests();
  }, [token]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((item) => item.currentStatus === "pending").length,
      approved: requests.filter((item) => item.currentStatus === "approved").length,
      rejected: requests.filter((item) => item.currentStatus === "rejected").length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      if (filter !== "all" && item.currentStatus !== filter) return false;
      if (typeFilter !== "all" && item.requestType !== typeFilter) return false;

      const keyword = search.trim().toLowerCase();
      if (!keyword) return true;

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
                const canAction = item.currentStatus === "pending";

                return (
                  <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.entityCode || `REQ-${item.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <Link
                          href={typeConfig.href(item.entityId)}
                          className="block text-xs font-medium leading-relaxed line-clamp-1 text-primary transition-colors hover:text-primary/80 hover:underline"
                        >
                          {item.entityTitle || "Tanpa judul"}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                          {item.notes || `Menunggu review ${item.currentApproverRole}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.entityOrgName || "—"}
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
                        <p className="text-xs font-medium">{item.requestedByName || "System"}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground capitalize">
                          Approver: {item.currentApproverRole || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {formatDate(item.requestedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "h-5 px-1.5 text-[10px] font-medium border",
                          statusVariant[item.currentStatus]
                        )}
                      >
                        {statusLabel[item.currentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canAction ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                openApprovalModal(
                                  item.id,
                                  item.entityTitle || "Tanpa judul",
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
                                  item.entityTitle || "Tanpa judul",
                                  "reject"
                                )
                              }
                              className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="size-3" />
                              Tolak
                            </Button>
                          </>
                        ) : (
                          <span className="px-2 text-[10px] text-muted-foreground">
                            {item.currentStatus === "pending" ? "Siap untuk testing approval" : "Tidak ada aksi"}
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
    </div>
  );
}
