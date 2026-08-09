"use client";

import { useState } from "react";

import { MitigationProgressForm } from "@/components/shared/design-system";

export function MitigationProgressFormExample() {
  const [evidenceUrl, setEvidenceUrl] = useState("https://drive.google.com/...");
  const [notes, setNotes] = useState("Dokumentasi aksi sudah diunggah.");

  return (
    <MitigationProgressForm
      evidenceUrl={evidenceUrl}
      onEvidenceUrlChange={setEvidenceUrl}
      notes={notes}
      onNotesChange={setNotes}
    />
  );
}
