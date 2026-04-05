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
import { Loader2 } from "lucide-react";

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
          <DialogTitle className="text-base">Tambah Log Komunikasi</DialogTitle>
          <DialogDescription className="text-xs">
            Catat komunikasi dengan stakeholder terkait risiko ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Tanggal<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Metode<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={method} onValueChange={(v) => setMethod(v as CommunicationMethod)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNICATION_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {COMMUNICATION_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Stakeholder<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              value={stakeholder}
              onChange={(e) => setStakeholder(e.target.value)}
              className="text-xs"
              placeholder="Nama stakeholder atau unit"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Catatan<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[100px]"
              placeholder="Ringkasan komunikasi atau hasil diskusi..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !date || !stakeholder.trim() || !notes.trim()}
            className="gap-2 text-xs"
          >
            {submitting ? <Loader2 className="size-3 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}