"use client";

import { RiskAssessmentSummaryStrip } from "@/components/shared/design-system";

export function RiskAssessmentSummaryExample() {
  return (
    <div className="space-y-3">
      <RiskAssessmentSummaryStrip
        title="Hasil Penilaian"
        score={18}
        level="tinggi"
        scoreLabel="Skor risiko"
        statusLabel="Di Atas Batas"
        statusTone="warning"
        metrics={[
          { label: "Bobot", value: <span className="font-mono tabular-nums">2.50</span> },
          { label: "Prioritas", value: <span className="tabular-nums">4</span> },
        ]}
        note="Risiko utama. Pertimbangkan mitigasi."
        noteTone="warning"
      />
      <RiskAssessmentSummaryStrip
        title="Target Penurunan"
        score={6}
        level="rendah"
        scoreLabel="Skor target"
        metrics={[
          { label: "Bobot", value: <span className="font-mono tabular-nums">1.00</span> },
          { label: "Prioritas", value: <span className="tabular-nums">2</span> },
        ]}
      />
    </div>
  );
}
