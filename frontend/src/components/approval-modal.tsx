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
import { Check, X, Loader2 } from "lucide-react";

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: string | null;
  approvalType: "approve" | "reject";
  entityTitle?: string;
  onSuccess?: () => void;
  token?: string;
}

export function ApprovalModal({
  open,
  onOpenChange,
  approvalId,
  approvalType,
  entityTitle,
  onSuccess,
  token,
}: ApprovalModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApprove = approvalType === "approve";
  const title = isApprove ? "Setujui Risiko" : "Tolak Risiko";
  const description = isApprove
    ? "Apakah Anda yakin ingin menyetujui risiko ini?"
    : "Apakah Anda yakin ingin menolak risiko ini?";

  const handleSubmit = async () => {
    if (!approvalId || !token) {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(
        `/approvals/${approvalId}/action`,
        {
          action: approvalType,
          comments: message,
        },
        token
      );

      toast.success(
        isApprove
          ? "Risiko berhasil disetujui"
          : "Risiko berhasil ditolak"
      );

      // Reset form
      setMessage("");
      onOpenChange(false);

      // Trigger success callback
      onSuccess?.();
    } catch (err) {
      console.error("Failed to process approval", err);
      toast.error(
        isApprove
          ? "Gagal menyetujui risiko. Silakan coba lagi."
          : "Gagal menolak risiko. Silakan coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setMessage("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
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
                "{entityTitle}"
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
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
            className="min-h-[100px] resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Pesan ini akan dicatat dalam riwayat persetujuan.
          </p>
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
                {isApprove ? "Setuju" : "Tolak"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
