"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Log Komunikasi</DialogTitle>
          <DialogDescription>
            Catat komunikasi dengan stakeholder terkait risiko ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Tanggal<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Metode<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={method} onValueChange={(v) => setMethod(v as CommunicationMethod)}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Stakeholder<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              value={stakeholder}
              onChange={(e) => setStakeholder(e.target.value)}
              placeholder="Nama stakeholder atau unit"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Catatan<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
              placeholder="Ringkasan komunikasi atau hasil diskusi..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !date || !stakeholder.trim() || !notes.trim()}
            className="gap-2"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}