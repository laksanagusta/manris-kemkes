import { memo } from "react";
import { cn } from "@/lib/utils";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { Badge } from "@/components/ui/badge";
import { PropertyLabel, PropertyList } from "@/components/shared/design-system/layout/property-list";
import {
  getBobot,
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
          perubahan skor risiko.
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

  const riskLevelTone =
    levelBaru === "sangat_rendah" || levelBaru === "rendah"
      ? "success"
      : levelBaru === "sedang"
        ? "warning"
        : "danger";

  return (
    <div className="space-y-4">
      <section aria-label="Hasil Pemantauan">
        <PropertyList compact className="mt-0 [&_dt]:text-tertiary-foreground">
          <div className="flex items-center justify-between gap-4">
            <PropertyLabel showIcon={false}>Skor risiko</PropertyLabel>
            <dd className="flex items-center gap-2 text-right">
              <span className="text-sm font-medium tabular-nums text-foreground">
                {newScore}
              </span>
              <Badge variant={toBadgeVariant(riskLevelTone)} className={getStatusBadgeClassName(riskLevelTone)}
              >
                {getRiskLevelLabel(levelBaru)}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <PropertyLabel showIcon={false}>Bobot</PropertyLabel>
            <dd className="text-sm font-medium tabular-nums text-foreground">
              {bobot.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <PropertyLabel showIcon={false}>Prioritas</PropertyLabel>
            <dd className="text-sm font-semibold tabular-nums text-foreground">
              {scoreClassification.priority}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <PropertyLabel showIcon={false}>Selera risiko</PropertyLabel>
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
        </PropertyList>
      </section>

      <section
        aria-labelledby="monitoring-score-change"
        className="border-t border-dashed border-border/70 pt-5"
      >
        <h3
          id="monitoring-score-change"
          className="text-sm font-semibold text-primary"
        >
          Perubahan Skor
        </h3>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {currentScore} &rarr; {newScore}
          </span>
        </div>
      </section>

      <section
        aria-labelledby="monitoring-risk-evaluation"
        className="border-t border-dashed border-border/70 pt-5"
      >
        <h3
          id="monitoring-risk-evaluation"
          className="text-sm font-semibold text-primary"
        >
          Evaluasi
        </h3>
        <PropertyList compact className="[&_dt]:text-tertiary-foreground">
          <div className="flex items-start justify-between gap-4">
            <PropertyLabel showIcon={false}>Tingkat risiko</PropertyLabel>
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
                ? "Skor tetap"
                : isDecrease
                  ? "Skor menurun"
                  : "Skor meningkat"}
            </dd>
          </div>

        </PropertyList>
      </section>
    </div>
  );
});
