"use client";
import { toast } from "sonner";


import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Clock,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ApprovalModal } from "@/components/approval-modal";

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
  currentStatus: string;
  currentApproverRole: string;
  notes?: string;
}

const statusVariant: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  approved: "bg-green-500/15 text-green-700 border-green-500/20",
  rejected: "bg-red-500/15 text-red-700 border-red-500/20",
};

const requestTypeIcon: Record<string, any> = {
  risk: FileText,
  incident: AlertTriangle,
};

export default function InboxPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"approve" | "reject">("approve");
  const [selectedApproval, setSelectedApproval] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      const data = await api.get<ApprovalRequest[]>(`/approvals?status=${filter}`, token);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token, filter]);

  const openApprovalModal = (id: string, title: string, type: "approve" | "reject") => {
    setSelectedApproval({ id, title });
    setModalType(type);
    setModalOpen(true);
  };

  const pendingCount = requests.filter((r) => r.currentStatus === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Inbox Persetujuan
        </h1>
        <p className="text-sm text-muted-foreground">
          Daftar permintaan persetujuan ({pendingCount} menunggu)
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {(
          [
            { key: "all", label: "Semua" },
            { key: "pending", label: "Menunggu" },
            { key: "approved", label: "Disetujui" },
            { key: "rejected", label: "Ditolak" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approval Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-muted-foreground size-6" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-8 text-sm text-muted-foreground border rounded-lg border-dashed">
            Belum ada permintaan persetujuan.
          </div>
        ) : (
          requests.map((item) => {
            const Icon = requestTypeIcon[item.requestType] || FileText;
            return (
              <Card
                key={item.id}
                className={cn(
                  "border-border/50 bg-card/80 transition-all hover:shadow-md",
                  item.currentStatus === "pending" && "border-l-4 border-l-primary"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {item.entityCode || `REQ-${item.id.slice(0, 8)}`}
                        </span>
                        <Badge
                          className={cn(
                            "text-[9px] font-semibold border h-4 px-1.5 uppercase",
                            statusVariant[item.currentStatus]
                          )}
                        >
                          {item.currentStatus}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase">
                          {item.requestType}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold">{item.entityTitle || "Untitled"}</h3>
                      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
                        <span>{item.entityOrgName || "—"}</span>
                        <span>Oleh: {item.requestedByName || "System"}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(item.requestedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {item.notes && (
                        <div className="mt-2 text-[10px] text-muted-foreground italic">
                          "{item.notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.currentStatus === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openApprovalModal(item.id, item.entityTitle || "Untitled", "approve")}
                            className="gap-1.5 h-7 text-xs shadow-sm"
                          >
                            <Check className="size-3" />
                            Setuju
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openApprovalModal(item.id, item.entityTitle || "Untitled", "reject")}
                            className="gap-1.5 h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="size-3" />
                            Tolak
                          </Button>
                        </>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-5 px-2",
                            item.currentStatus === "approved"
                              ? "text-success border-success/20"
                              : "text-destructive border-destructive/20"
                          )}
                        >
                          {item.currentStatus === "approved" ? "Disetujui" : "Ditolak"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        approvalId={selectedApproval?.id || null}
        approvalType={modalType}
        entityTitle={selectedApproval?.title}
        onSuccess={() => fetchRequests()}
        token={token || undefined}
      />
    </div>
  );
}
