"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
  History,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  shouldRenderReviewSidePanelWorkflow,
  type ReviewWorkflowStage,
} from "@/lib/review-side-panel-access";
import {
  buildApprovalStepperViewModel,
  type StepperNodeState,
} from "@/lib/approval-stepper-view-model";

export interface RiskWorkflowState {
  currentStatus?: string | null;
  currentApproverRole?: string | null;
  currentApproverUserId?: string | null;
  steps?: {
    approverUserId?: string | null;
    approverName?: string | null;
    stepType?: string | null;
    status?: string | null;
  }[];
}

type WorkflowStage = ReviewWorkflowStage;
type ActionStage = "review" | "approval";

interface ReviewSidePanelProps {
  approvalId: string | null;
  approvalWorkflow?: RiskWorkflowState | null;
  currentUserId?: string;
  riskStatus: string;
  userRole: string;
  inherentScore?: number;
  token?: string;
  allowStatusFallbackWorkflowStage?: boolean;
  onActionComplete?: () => void;
  onNavigateToLog?: () => void;
}

export function ReviewSidePanel({
  approvalId,
  approvalWorkflow,
  currentUserId,
  riskStatus,
  userRole,
  inherentScore,
  token,
  allowStatusFallbackWorkflowStage = true,
  onActionComplete,
  onNavigateToLog,
}: ReviewSidePanelProps) {
  const [reviewMessage, setReviewMessage] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [submittingStage, setSubmittingStage] = useState<ActionStage | null>(
    null,
  );
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  const workflowStatus = approvalWorkflow?.currentStatus ?? null;
  const currentApproverUserId = approvalWorkflow?.currentApproverUserId ?? null;
  const steps = approvalWorkflow?.steps ?? [];

  const shouldRenderWorkflow = shouldRenderReviewSidePanelWorkflow({
    approvalId,
    approvalWorkflow,
    riskStatus,
    allowStatusFallbackWorkflowStage,
  });
  const isSubmitting = submittingStage !== null;
  const isApproved = riskStatus === "final";
  const workflowStage: WorkflowStage = (() => {
    if (
      workflowStatus === "approved" ||
      workflowStatus === "rejected" ||
      isApproved
    ) {
      return "final";
    }

    if (workflowStatus === "pending") {
      const activeStep =
        steps.find(
          (s) =>
            s.approverUserId &&
            s.approverUserId === currentApproverUserId &&
            s.status === "pending",
        ) ?? steps.find((s) => s.status === "pending");

      if (activeStep?.stepType === "review") return "review";
      if (activeStep?.stepType === "approval") return "approval";
    }

    if (
      allowStatusFallbackWorkflowStage &&
      riskStatus === "draft"
    ) {
      return "review";
    }

    return "unknown";
  })();

  if (!shouldRenderWorkflow) {
    return null;
  }

  const stepperStateClassName: Record<StepperNodeState, string> = {
    completed: "border-success/20 bg-success/10 text-success",
    current: "border-primary/20 bg-primary/[0.06] text-primary",
    upcoming: "border-border bg-muted/40 text-muted-foreground",
    rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  };

  const stepperNodes = approvalWorkflow
    ? buildApprovalStepperViewModel(approvalWorkflow, riskStatus, currentUserId)
    : [];

  const handleAction = async (
    action: "approve" | "reject",
    stage: ActionStage,
  ) => {
    if (!approvalId || !token) {
      toast.error("Terjadi kesalahan. Approval ID tidak ditemukan.");
      return;
    }

    setSubmittingStage(stage);
    try {
      const payload: Record<string, unknown> = {
        action,
        comments: stage === "review" ? reviewMessage : approvalMessage,
      };

      await api.post(`/approvals/${approvalId}/action`, payload, token);

      toast.success(
        action === "approve"
          ? stage === "review"
            ? "Review berhasil disetujui"
            : "Risiko berhasil disetujui"
          : "Risiko berhasil ditolak",
      );

      if (stage === "review") {
        setReviewMessage("");
        setReviewModalOpen(false);
      } else {
        setApprovalMessage("");
        setApprovalModalOpen(false);
      }

      onActionComplete?.();
    } catch (err) {
      console.error("Failed to process approval", err);
      toast.error(
        action === "approve"
          ? stage === "review"
            ? "Gagal menyetujui review. Silakan coba lagi."
            : "Gagal menyetujui risiko. Silakan coba lagi."
          : "Gagal menolak. Silakan coba lagi.",
      );
    } finally {
      setSubmittingStage(null);
    }
  };

  const renderReviewModal = () => (
    <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tinjau pemantauan risiko</DialogTitle>
          <DialogDescription>
            Pastikan pemantauan telah sesuai dengan kondisi terkini
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Textarea
            placeholder="Tambahkan catatan peninjauan"
            value={reviewMessage}
            onChange={(e) => setReviewMessage(e.target.value)}
            disabled={submittingStage === "review"}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleAction("reject", "review")}
              disabled={submittingStage === "review"}
              className="flex-1 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {submittingStage === "review" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Tolak
            </Button>
            <Button
              onClick={() => handleAction("approve", "review")}
              disabled={submittingStage === "review"}
              className="flex-1"
            >
              {submittingStage === "review" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Setujui
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderApprovalModal = () => (
    <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Beri Persetujuan</DialogTitle>
          <DialogDescription>
            Berikan keputusan persetujuan atau penolakan untuk risiko ini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Textarea
            placeholder="Tambahkan pesan persetujuan atau alasan penolakan..."
            value={approvalMessage}
            onChange={(e) => setApprovalMessage(e.target.value)}
            disabled={submittingStage === "approval"}
            className="min-h-[80px] resize-none"
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleAction("reject", "approval")}
              disabled={submittingStage === "approval"}
              className="flex-1 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {submittingStage === "approval" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Tolak
            </Button>
            <Button
              onClick={() => handleAction("approve", "approval")}
              disabled={submittingStage === "approval"}
              className="flex-1"
            >
              {submittingStage === "approval" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Setujui
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      {stepperNodes.length > 0 && (
        <div className="rounded-xl bg-card p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
          <div className="space-y-0">
            {stepperNodes.map((node, index) => {
              const isLast = index === stepperNodes.length - 1;
              const isCompleted = node.state === "completed";
              const isCurrent = node.state === "current";
              const isUpcoming = node.state === "upcoming";
              const isRejectedNode = node.state === "rejected";

              return (
                <div
                  key={`${node.label}-${node.actorName}`}
                  className={cn("flex gap-3", isUpcoming && "opacity-75")}
                >
                  <div className="flex flex-col items-center">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-success/30 bg-success/20">
                          <CheckCircle2 className="size-4 text-success" />
                        </div>
                      ) : isCurrent ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                          <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                        </div>
                      ) : isRejectedNode ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-destructive/30 bg-destructive/20">
                          <XCircle className="size-4 text-destructive" />
                        </div>
                      ) : (
                        <div className="flex size-6 items-center justify-center rounded-full border border-border bg-muted">
                          <Circle className="size-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 flex-1 min-h-4",
                          isCompleted
                            ? "bg-success"
                            : isCurrent
                              ? "bg-primary/30"
                              : isRejectedNode
                                ? "bg-destructive/30"
                                : "bg-border",
                        )}
                      />
                    )}
                  </div>

                  <div
                    className={cn("min-w-0 flex-1", !isLast ? "pb-5" : "pb-0")}
                  >
                    <div className="space-y-3">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold leading-none">
                            {node.label}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            ·
                          </span>
                          <p className="truncate text-xs text-muted-foreground">
                            {node.actorName}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-2 text-[10px] font-semibold",
                              stepperStateClassName[node.state],
                            )}
                          >
                            {node.state === "completed"
                              ? "Selesai"
                              : node.state === "current"
                                ? node.isActionOwner
                                  ? "Giliran Anda"
                                  : "Aktif"
                                : node.state === "rejected"
                                  ? "Ditolak"
                                  : "Menunggu"}
                          </Badge>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {node.description}
                        </p>
                      </div>

                      {node.isActionOwner &&
                        isCurrent &&
                        workflowStage !== "final" && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (node.label === "Ditinjau") {
                                  setReviewModalOpen(true);
                                } else if (node.label === "Persetujuan") {
                                  setApprovalModalOpen(true);
                                }
                              }}
                              disabled={submittingStage !== null}
                              className="text-xs shadow-sm"
                            >
                              {node.label === "Ditinjau"
                                ? "Tinjau"
                                : "Beri Persetujuan"}
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {onNavigateToLog && (
            <div className="mt-3 flex justify-end border-t border-border/10 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onNavigateToLog}
                className="h-auto gap-1.5 px-0 text-xs text-primary hover:bg-transparent hover:text-primary"
              >
                <History className="size-3" />
                Lihat riwayat →
              </Button>
            </div>
          )}
        </div>
      )}

      {renderReviewModal()}
      {renderApprovalModal()}
    </div>
  );
}
