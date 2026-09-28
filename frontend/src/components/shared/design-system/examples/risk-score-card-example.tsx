"use client";

import { useState } from "react";
import { RiskScoreHeatmapModal, RiskScorePickerTrigger } from "@/components/shared/design-system";

export function RiskScoreCardExample() {
  const [selection, setSelection] = useState({ probability: 3, impact: 4 });
  const [open, setOpen] = useState(false);

  return (
    <>
      <RiskScorePickerTrigger
        title="Skor Risiko"
        presentation="card"
        {...selection}
        onClick={() => setOpen(true)}
      />
      <RiskScoreHeatmapModal
        title="Pilih skor risiko"
        open={open}
        onOpenChange={setOpen}
        {...selection}
        onApply={setSelection}
      />
    </>
  );
}
