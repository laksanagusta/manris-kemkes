import { memo } from "react";
import { cn } from "@/lib/utils";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { Badge } from "@/components/ui/badge";
import {
  getBobot,
  getSimpulanEfektifitas,
  getRiskLevelLabel,
  resolveRiskAssessmentClassification,
} from "@/lib/risk";
import { resolveAssessmentScoreComparison } from "@/lib/risk-assessment-summary";

export interface SimpulanCardProps {
  nilaiCurrent: number;
  nilaiBaru: number;
  currentInherentScore?: number;
  probability?: number;
  impact?: number;
}

export const SimpulanCard = memo(function SimpulanCard({
  nilaiCurrent,
  nilaiBaru,
  currentInherentScore,
  probability = 1,
  impact = 1,
}: SimpulanCardProps) {
  const isInvalid = !nilaiBaru || isNaN(nilaiBaru);

  if (isInvalid) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Pilih probabilitas dan dampak terlebih dahulu untuk melihat simpulan
          tingkat risiko dan efektifitas mitigasi.
        </p>
      </div>
    );
  }

  const scoreClassification = resolveRiskAssessmentClassification(nilaiBaru);
  const levelBaru = scoreClassification.level;
  const bobot = getBobot(probability, impact);
  const { currentScore, newScore, isStable, isDecrease } =
    resolveAssessmentScoreComparison({
      currentInherentScore,
      currentNilai: nilaiCurrent,
      newNilai: nilaiBaru,
    });

  const efektifitasLabel = getSimpulanEfektifitas(currentScore, newScore);
  const riskLevelTone =
    levelBaru === "sangat_rendah" || levelBaru === "rendah"
      ? "success"
      : levelBaru === "sedang"
        ? "warning"
        : "danger";

  return (
    <div className="space-y-4">
      <section aria-label="Hasil Pemantauan">
        <dl>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-[13px] text-muted-foreground">Skor risiko</dt>
            <dd className="flex items-center gap-2 text-right">
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {newScore}
              </span>
              <Badge variant={toBadgeVariant(riskLevelTone)} className={getStatusBadgeClassName(riskLevelTone)}
              >
                {getRiskLevelLabel(levelBaru)}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-[13px] text-muted-foreground">Bobot</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {bobot.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-[13px] text-muted-foreground">Prioritas</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground">
              {scoreClassification.priority}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-[13px] text-muted-foreground">Selera risiko</dt>
            <dd>
              <Badge variant={
                  scoreClassification.appetite === "di_atas_batas"
                    ? "outline"
                    : "default"
                }
              >
                {scoreClassification.appetite === "di_atas_batas"
                  ? "Di Atas Batas"
                  : "Dalam Batas"}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="monitoring-score-change"
        className="border-t border-dashed border-border/50 pt-3.5"
      >
        <h3
          id="monitoring-score-change"
          className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
        >
          Perubahan Skor
        </h3>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {currentScore} &rarr; {newScore}
          </span>
        </div>
      </section>

      <section
        aria-labelledby="monitoring-risk-evaluation"
        className="border-t border-dashed border-border/50 pt-3.5"
      >
        <h3
          id="monitoring-risk-evaluation"
          className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
        >
          Evaluasi
        </h3>
        <dl className="mt-3">
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-[13px] text-muted-foreground">Tingkat risiko</dt>
            <dd
              className={cn(
                "min-w-0 max-w-[70%] whitespace-normal break-words text-right text-sm font-medium",
                isStable
                  ? "text-muted-foreground"
                  : isDecrease
                    ? "text-success"
                    : "text-risk-extreme",
              )}
            >
              {isStable
                ? "Tidak ada penurunan tingkat risiko"
                : isDecrease
                  ? "Tingkat risiko mengalami penurunan"
                  : "Tingkat risiko mengalami peningkatan"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-[13px] text-muted-foreground">Efektivitas</dt>
            <dd>
              <Badge variant={efektifitasLabel === "Efektif" ? "default" : "destructive"}
                className={efektifitasLabel === "Efektif" ? "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}
              >
                {efektifitasLabel}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
});
