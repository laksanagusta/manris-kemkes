"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "@/components/ui/icons";
import {
  AccentButton,
  CollectionDialogCancel,
} from "@/components/shared/design-system";

import type { CommunicationMethod } from "@/types/communication-log";
import { COMMUNICATION_METHODS, COMMUNICATION_METHOD_LABELS } from "@/types/communication-log";
import { createCommunicationLog } from "@/lib/communication-logs";

interface CommunicationLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskId: string;
  token: string;
  onSuccess: () => void;
}

export function CommunicationLogDialog({
  open,
  onOpenChange,
  riskId,
  token,
  onSuccess,
}: CommunicationLogDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<CommunicationMethod>("Meeting");
  const [stakeholder, setStakeholder] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!date || !method || !stakeholder.trim() || !notes.trim()) {
      toast.error("Lengkapi semua field wajib");
      return;
    }

    setSubmitting(true);
    try {
      await createCommunicationLog(
        riskId,
        {
          date,
          method,
          stakeholder: stakeholder.trim(),
          notes: notes.trim(),
        },
        token
      );
      toast.success("Log komunikasi berhasil ditambahkan");
      onSuccess();
      // Reset form
      setDate(new Date().toISOString().split("T")[0]);
      setMethod("Meeting");
      setStakeholder("");
      setNotes("");
    } catch {
      toast.error("Gagal menambahkan log komunikasi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("Meeting");
    setStakeholder("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl no-scrollbar"
        showCloseButton={false}
      >
        <div className="flex min-h-0 flex-col gap-5">
          <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
            <DialogTitle className="text-base">
              Tambah Log Komunikasi
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium" htmlFor="log-date">
                Tanggal<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="log-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-base sm:text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium" htmlFor="log-method">
                Metode<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as CommunicationMethod)}
              >
                <SelectTrigger
                  id="log-method"
                  className="text-base sm:text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {COMMUNICATION_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                className="text-sm font-medium"
                htmlFor="log-stakeholder"
              >
                Stakeholder<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="log-stakeholder"
                value={stakeholder}
                onChange={(e) => setStakeholder(e.target.value)}
                placeholder="Nama stakeholder atau unit"
                className="text-base sm:text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium" htmlFor="log-notes">
                Catatan<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                id="log-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] text-base sm:text-sm"
                placeholder="Ringkasan komunikasi atau hasil diskusi..."
              />
            </div>
          </div>

          <DialogFooter className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
            <CollectionDialogCancel type="button" onClick={handleClose}>
              Batal
            </CollectionDialogCancel>
            <AccentButton
              onClick={handleSubmit}
              disabled={
                submitting || !date || !stakeholder.trim() || !notes.trim()
              }
              icon={
                submitting ? <Loader2 className="size-3 animate-spin" /> : null
              }
            >
              Simpan
            </AccentButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
