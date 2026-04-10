"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  UserCheck,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewScoringGrid } from "@/components/shared/review-scoring-grid";
import {
  getRiskLevelDisplayLabel,
  getLevelBadgeClasses,
  getScoreBtnColorClasses,
  getBobot,
  calculateNilai,
  getRiskLevelFromNilai,
} from "@/lib/risk";
import {
  canActivateApprovalPanel,
  canActivateReviewerPanel,
  type ReviewWorkflowStage,
} from "@/lib/review-side-panel-access";

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
  reviewedScore?: number | null;
  reviewedProbability?: number | null;
  reviewedImpact?: number | null;
  token?: string;
  onActionComplete?: () => void;
}

export function ReviewSidePanel({
  approvalId,
  approvalWorkflow,
  currentUserId,
  riskStatus,
  userRole,
  inherentScore,
  reviewedScore,
  reviewedProbability: initialReviewedProbability,
  reviewedImpact: initialReviewedImpact,
  token,
  onActionComplete,
}: ReviewSidePanelProps) {
  const [reviewMessage, setReviewMessage] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [submittingStage, setSubmittingStage] = useState<ActionStage | null>(null);
  const [reviewedProbability, setReviewedProbability] = useState<number | null>(
    initialReviewedProbability ?? null,
  );
  const [reviewedImpact, setReviewedImpact] = useState<number | null>(
    initialReviewedImpact ?? null,
  );

  useEffect(() => {
    setReviewedProbability(initialReviewedProbability ?? null);
  }, [initialReviewedProbability]);

  useEffect(() => {
    setReviewedImpact(initialReviewedImpact ?? null);
  }, [initialReviewedImpact]);

  const workflowStatus = approvalWorkflow?.currentStatus ?? null;
  const currentApproverRole = approvalWorkflow?.currentApproverRole ?? null;
  const currentApproverUserId = approvalWorkflow?.currentApproverUserId ?? null;

  const hasApproval = Boolean(approvalId);
  const isSubmitting = submittingStage !== null;
  const isApproved = riskStatus === "approved";
  const isRejected = riskStatus === "rejected";

  const workflowStage: WorkflowStage = (() => {
    if (
      workflowStatus === "approved" ||
      workflowStatus === "rejected" ||
      isApproved ||
      isRejected
    ) {
      return "final";
    }

    if (workflowStatus === "pending") {
      if (currentApproverRole === "reviewer") return "review";
      if (currentApproverRole === "pimpinan") return "approval";
    }

    if (riskStatus === "in_review") return "review";
    if (riskStatus === "in_approval") return "approval";

    return "unknown";
  })();

  const reviewerIsActive = canActivateReviewerPanel({
    workflowStage,
    currentApproverUserId,
    currentUserId,
    userRole,
  });
  const approvalIsActive = canActivateApprovalPanel({
    workflowStage,
    currentApproverUserId,
    currentUserId,
  });

  if (!hasApproval) {
    return null;
  }

  const handleAction = async (
    action: "approve" | "reject",
    stage: ActionStage,
  ) => {
    if (!approvalId || !token) {
      toast.error("Terjadi kesalahan. Approval ID tidak ditemukan.");
      return;
    }

    if (
      stage === "review" &&
      action === "approve" &&
      (!reviewedProbability || !reviewedImpact)
    ) {
      toast.error("Silakan tentukan skor probabilitas dan dampak penilaian.");
      return;
    }

    setSubmittingStage(stage);
    try {
      const payload: Record<string, unknown> = {
        action,
        comments: stage === "review" ? reviewMessage : approvalMessage,
      };

      if (stage === "review" && reviewedProbability && reviewedImpact) {
        payload.reviewedProbability = reviewedProbability;
        payload.reviewedImpact = reviewedImpact;
      }

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
      } else {
        setApprovalMessage("");
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

  const getStatusBadge = () => {
    switch (riskStatus) {
      case "in_review":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-500/20"
          >
            Sedang Ditinjau
          </Badge>
        );
      case "in_approval":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
          >
            Menunggu Persetujuan
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20"
          >
            Disetujui
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-500/20"
          >
            Ditolak
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPanelBadge = (type: ActionStage) => {
    if ((type === "review" && reviewerIsActive) || (type === "approval" && approvalIsActive)) {
      return (
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/[0.06] text-primary"
        >
          Aktif
        </Badge>
      );
    }

    if (workflowStage === "final") {
      return (
        <Badge
          variant="outline"
          className={cn(
            riskStatus === "rejected"
              ? "border-red-500/20 bg-red-500/10 text-red-600"
              : "border-green-500/20 bg-green-500/10 text-green-600",
          )}
        >
          Selesai
        </Badge>
      );
    }

    if (type === "review" && workflowStage === "approval") {
      return (
        <Badge
          variant="outline"
          className="border-green-500/20 bg-green-500/10 text-green-600"
        >
          Selesai Ditinjau
        </Badge>
      );
    }

    if (type === "approval" && workflowStage === "review") {
      return (
        <Badge
          variant="outline"
          className="border-border/60 bg-muted/30 text-muted-foreground"
        >
          Menunggu Review
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="border-border/60 bg-muted/30 text-muted-foreground"
      >
        Baca Saja
      </Badge>
    );
  };

  const renderInfoNotice = (message: string) => (
    <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
      {message}
    </div>
  );

  const renderReviewerScoring = () => {
    if (!reviewerIsActive) return null;

    return (
      <div className="space-y-4 rounded-lg border bg-background p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-foreground" />
          <h4 className="text-sm font-semibold text-foreground">
            Skor Penilaian Reviewer
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Tentukan skor probabilitas dan dampak berdasarkan hasil penilaian Anda.
        </p>

        <ReviewScoringGrid
          reviewedProbability={reviewedProbability}
          reviewedImpact={reviewedImpact}
          onProbabilityChange={setReviewedProbability}
          onImpactChange={setReviewedImpact}
          disabled={isSubmitting}
        />
      </div>
    );
  };

  const renderPimpinanPreview = () => {
    if (!reviewedScore) return null;

    const nilai =
      reviewedProbability && reviewedImpact
        ? calculateNilai(
            reviewedProbability,
            reviewedImpact,
            getBobot(reviewedProbability, reviewedImpact),
          )
        : null;
    const level = nilai ? getRiskLevelFromNilai(nilai) : null;
    const levelLabel = level ? getRiskLevelDisplayLabel(level) : null;

    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-semibold">Hasil Penilaian Reviewer</h4>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Skor Penilaian</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm font-bold",
                  getScoreBtnColorClasses(reviewedScore),
                )}
              >
                {reviewedScore}
              </span>
              {levelLabel && (
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border",
                    getLevelBadgeClasses(levelLabel),
                  )}
                >
                  {levelLabel}
                </span>
              )}
            </div>
          </div>
          {reviewedProbability && reviewedImpact && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">P × D</p>
              <p className="text-xs font-mono font-medium">
                {reviewedProbability} × {reviewedImpact}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReviewerSummary = () => {
    if (!reviewedScore) return null;

    const nilai =
      reviewedProbability && reviewedImpact
        ? calculateNilai(
            reviewedProbability,
            reviewedImpact,
            getBobot(reviewedProbability, reviewedImpact),
          )
        : null;
    const level = nilai ? getRiskLevelFromNilai(nilai) : null;
    const levelLabel = level ? getRiskLevelDisplayLabel(level) : null;

    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-semibold">Hasil Penilaian</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Skor Awal</p>
            <p className="text-sm font-medium">{inherentScore ?? "-"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Skor Review</p>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold",
                  getScoreBtnColorClasses(reviewedScore),
                )}
              >
                {reviewedScore}
              </span>
              {levelLabel && (
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium border",
                    getLevelBadgeClasses(levelLabel),
                  )}
                >
                  {levelLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = (stage: ActionStage) => {
    const isReviewStage = stage === "review";
    const isActive = isReviewStage ? reviewerIsActive : approvalIsActive;

    if (!isActive || workflowStage === "final") return null;

    return (
      <div className="space-y-3">
        <Textarea
          placeholder={
            isReviewStage
              ? "Tambahkan catatan review atau alasan keputusan..."
              : "Tambahkan pesan persetujuan atau alasan penolakan..."
          }
          value={isReviewStage ? reviewMessage : approvalMessage}
          onChange={(event) => {
            if (isReviewStage) {
              setReviewMessage(event.target.value);
              return;
            }

            setApprovalMessage(event.target.value);
          }}
          disabled={isSubmitting}
          className="min-h-[80px] resize-none"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("reject", stage)}
            disabled={isSubmitting}
            className="flex-1 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <X className="mr-2 size-4" />
            )}
            Tolak
          </Button>
          <Button
            type="button"
            onClick={() => handleAction("approve", stage)}
            disabled={
              isSubmitting ||
              (isReviewStage && (!reviewedProbability || !reviewedImpact))
            }
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            {isReviewStage ? "Setujui Review" : "Setujui Approval"}
          </Button>
        </div>
      </div>
    );
  };

  const renderReviewerPanelBody = () => {
    if (reviewerIsActive) {
      return (
        <>
          {renderReviewerScoring()}
          {renderActionButtons("review")}
        </>
      );
    }

    if (reviewedScore) {
      return (
        <>
          {renderReviewerSummary()}
          {renderInfoNotice(
            workflowStage === "approval"
              ? "Tahap review sudah selesai. Panel ini menampilkan ringkasan hasil penilaian reviewer."
              : workflowStage === "final"
                ? "Workflow persetujuan sudah selesai. Panel review hanya dapat dibaca."
                : "Panel review saat ini tidak dapat diubah.",
          )}
        </>
      );
    }

    return renderInfoNotice(
      workflowStage === "review"
        ? "Panel ini hanya aktif untuk reviewer yang sedang mendapat giliran pada workflow."
        : workflowStage === "approval"
          ? "Tahap review telah dilewati dan ringkasan penilaian akan muncul setelah skor reviewer tersedia."
          : workflowStage === "final"
            ? "Workflow persetujuan sudah selesai. Tidak ada tindakan pada panel review."
            : "Data workflow review belum tersedia.",
    );
  };

  const renderApprovalPanelBody = () => {
    if (approvalIsActive) {
      return (
        <>
          {renderPimpinanPreview()}
          {renderActionButtons("approval")}
        </>
      );
    }

    if (workflowStage === "review") {
      return (
        <>
          {renderPimpinanPreview()}
          {renderInfoNotice(
            "Tahap approval belum aktif. Panel ini akan aktif setelah reviewer menyelesaikan penilaian.",
          )}
        </>
      );
    }

    if (workflowStage === "approval") {
      return (
        <>
          {renderPimpinanPreview()}
          {renderInfoNotice(
            "Panel ini hanya aktif untuk pengguna yang sedang mendapat giliran pada workflow approval.",
          )}
        </>
      );
    }

    if (workflowStage === "final") {
      return (
        <>
          {renderPimpinanPreview()}
          {renderInfoNotice(
            riskStatus === "rejected"
              ? "Risiko telah ditolak. Tidak ada tindakan lanjutan pada panel approval."
              : "Risiko telah selesai diproses. Panel approval hanya dapat dibaca.",
          )}
        </>
      );
    }

    return renderInfoNotice("Data workflow approval belum tersedia.");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{getStatusBadge()}</div>

      <Card className="border-border/20 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserCheck className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold">
                  Penilaian Reviewer
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Reviewer memberikan skor penilaian dan keputusan review.
                </p>
              </div>
            </div>
            {getPanelBadge("review")}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {renderReviewerPanelBody()}
        </CardContent>
      </Card>

      <Card className="border-border/20 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold">
                  Persetujuan Risiko
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pengguna yang sedang mendapat giliran dapat menyetujui atau menolak risiko setelah tahap review selesai.
                </p>
              </div>
            </div>
            {getPanelBadge("approval")}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {renderApprovalPanelBody()}
        </CardContent>
      </Card>
    </div>
  );
}
