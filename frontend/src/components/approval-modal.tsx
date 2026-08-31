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
import { Check, X, Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

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

  const isApprove = approvalType === "approve";
  const isReviewer = approverRole === "reviewer";
  const requestLabel =
    requestType === "assessment"
      ? "Pemantauan"
      : requestType === "working_paper"
        ? "Kertas Kerja"
        : "Risiko";

  const title = isApprove
    ? isReviewer
      ? "Setujui Review"
      : `Setujui ${requestLabel}`
    : `Tolak ${requestLabel}`;
  const description = isApprove
    ? isReviewer
      ? "Setujui hasil review risiko ini dan berikan skor penilaian Anda."
      : `Apakah Anda yakin ingin menyetujui ${requestLabel.toLowerCase()} ini?`
    : `Apakah Anda yakin ingin menolak ${requestLabel.toLowerCase()} ini?`;

  const handleSubmit = async () => {
    if (!approvalId || !token) {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        action: approvalType,
        comments: message,
      };

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
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("sm:max-w-md")} showCloseButton={!isSubmitting}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isApprove
                  ? "bg-primary/15 text-primary"
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
          <DialogDescription>
            {description}
            {entityTitle && (
              <span className="block mt-1 font-medium text-foreground">
                &quot;{entityTitle}&quot;
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            disabled={isSubmitting}
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
                    : `Setujui ${requestLabel}`
                  : "Tolak"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
