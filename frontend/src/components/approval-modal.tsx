"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewScoringGrid } from "@/components/shared/review-scoring-grid";

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: string | null;
  approvalType: "approve" | "reject";
  entityTitle?: string;
  requestType?: string;
  approverRole?: string;
  onSuccess?: () => void;
  token?: string;
}

export function ApprovalModal({
  open,
  onOpenChange,
  approvalId,
  approvalType,
  entityTitle,
  requestType,
  approverRole,
  onSuccess,
  token,
}: ApprovalModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedProbability, setReviewedProbability] = useState<number | null>(null);
  const [reviewedImpact, setReviewedImpact] = useState<number | null>(null);

  const isApprove = approvalType === "approve";
  const isRisk = requestType === "risk";
  const isReviewer = approverRole === "reviewer";
  const showScoring = isApprove && isRisk && isReviewer;

  const title = isApprove
    ? isReviewer
      ? "Setujui Review"
      : "Setujui Approval"
    : "Tolak Risiko";
  const description = isApprove
    ? isReviewer
      ? "Setujui hasil review risiko ini dan berikan skor penilaian Anda."
      : "Apakah Anda yakin ingin menyetujui risiko ini?"
    : "Apakah Anda yakin ingin menolak risiko ini?";

  const handleSubmit = async () => {
    if (!approvalId || !token) {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    if (showScoring && (!reviewedProbability || !reviewedImpact)) {
      toast.error("Silakan tentukan skor probabilitas dan dampak penilaian.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        action: approvalType,
        comments: message,
      };

      if (showScoring && reviewedProbability && reviewedImpact) {
        payload.reviewedProbability = reviewedProbability;
        payload.reviewedImpact = reviewedImpact;
      }

      await api.post(
        `/approvals/${approvalId}/action`,
        payload,
        token
      );

      toast.success(
        isApprove
          ? isReviewer
            ? "Review berhasil disetujui"
            : "Risiko berhasil disetujui"
          : "Risiko berhasil ditolak"
      );

      setMessage("");
      setReviewedProbability(null);
      setReviewedImpact(null);
      onOpenChange(false);

      onSuccess?.();
    } catch (err) {
      console.error("Failed to process approval", err);
      toast.error(
        isApprove
          ? isReviewer
            ? "Gagal menyetujui review. Silakan coba lagi."
            : "Gagal menyetujui risiko. Silakan coba lagi."
          : "Gagal menolak risiko. Silakan coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMessage("");
      setReviewedProbability(null);
      setReviewedImpact(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("sm:max-w-md", showScoring && "sm:max-w-lg")} showCloseButton={!isSubmitting}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isApprove
                  ? "bg-green-500/15 text-green-600"
                  : "bg-red-500/15 text-red-600"
              }`}
            >
              {isApprove ? (
                <Check className="size-4" />
              ) : (
                <X className="size-4" />
              )}
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
            {entityTitle && (
              <span className="block mt-1 font-medium text-foreground">
                &quot;{entityTitle}&quot;
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showScoring && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-primary">Skor Penilaian Reviewer</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Tentukan skor probabilitas dan dampak berdasarkan hasil penilaian Anda sebagai reviewer.
              </p>

              <ReviewScoringGrid
                reviewedProbability={reviewedProbability}
                reviewedImpact={reviewedImpact}
                onProbabilityChange={setReviewedProbability}
                onImpactChange={setReviewedImpact}
              />
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="approval-message"
              className="text-sm font-medium leading-none"
            >
              Pesan {isApprove ? "Persetujuan" : "Penolakan"}
              <span className="text-muted-foreground font-normal ml-1">
                (Opsional)
              </span>
            </label>
            <Textarea
              id="approval-message"
              placeholder={
                isApprove
                  ? "Tambahkan pesan atau alasan persetujuan..."
                  : "Jelaskan alasan penolakan..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px] resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Pesan ini akan dicatat dalam riwayat persetujuan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="sm:mr-2"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (showScoring && (!reviewedProbability || !reviewedImpact))}
            className={isApprove ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                {isApprove ? (
                  <Check className="mr-2 size-4" />
                ) : (
                  <X className="mr-2 size-4" />
                )}
                {isApprove
                  ? isReviewer
                    ? "Setujui Review"
                    : "Setujui Approval"
                  : "Tolak"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
