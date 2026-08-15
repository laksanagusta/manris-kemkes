"use client";

import { RiskAssessmentSummaryStrip } from "@/components/shared/design-system";
import { Card, CardContent } from "@/components/ui/card";

export function RiskSummaryStripExample() {
  return (
    <Card className="flex flex-col rounded-2xl bg-card">
      <div className="flex items-center border-b border-border/60 px-4 py-6">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Summary Strip
        </p>
      </div>
      <CardContent className="px-4 pb-4 pt-0">
        <RiskAssessmentSummaryStrip
          title="Hasil Penilaian"
          score={18}
          level="tinggi"
          scoreLabel="Skor risiko"
          metrics={[
            {
              label: "Bobot",
              value: <span className="font-mono tabular-nums">1.75</span>,
            },
            {
              label: "Prioritas",
              value: <span className="tabular-nums">Tinggi</span>,
            },
          ]}
          note="Contoh strip ringkas yang dipakai untuk ringkasan numerik."
        />
      </CardContent>
    </Card>
  );
}
