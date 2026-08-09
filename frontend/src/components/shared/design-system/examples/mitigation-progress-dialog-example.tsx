"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MitigationProgressDialog } from "@/components/shared/design-system";

export function MitigationProgressDialogExample() {
  const [open, setOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("https://drive.google.com/...");
  const [notes, setNotes] = useState("Dokumentasi aksi sudah diunggah.");

  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" onClick={() => setOpen(true)}>
        Open Mitigation Dialog
      </Button>
      <MitigationProgressDialog
        open={open}
        onOpenChange={setOpen}
        title="Lapor Progress Penanganan"
        description="Contoh mitigasi - Triwulan 2"
        evidenceUrl={evidenceUrl}
        onEvidenceUrlChange={setEvidenceUrl}
        notes={notes}
        onNotesChange={setNotes}
        footerActions={
          <Button size="sm" className="gap-2">
            <Send className="size-3" />
            Kirim Laporan
          </Button>
        }
        evidenceId="example-evidence-url"
        notesId="example-notes"
      />
    </div>
  );
}
