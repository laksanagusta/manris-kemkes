"use client";

import { useState } from "react";
import { Send } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import {
  AccentButton,
  MitigationProgressDialog,
} from "@/components/shared/design-system";

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
        evidenceUrl={evidenceUrl}
        onEvidenceUrlChange={setEvidenceUrl}
        notes={notes}
        onNotesChange={setNotes}
        footerActions={
          <AccentButton icon={<Send className="size-3" />}>
            Kirim Laporan
          </AccentButton>
        }
        evidenceId="example-evidence-url"
        notesId="example-notes"
      />
    </div>
  );
}
