import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/design-system";
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
  targetScore?: number;
  probability?: number;
  impact?: number;
}

export function SimpulanCard({
  nilaiCurrent,
  nilaiBaru,
  currentInherentScore,
  targetScore = 0,
  probability = 1,
  impact = 1,
}: SimpulanCardProps) {
  const isInvalid = !nilaiBaru || isNaN(nilaiBaru);

  if (isInvalid) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Pilih probabilitas dan dampak terlebih dahulu untuk melihat simpulan
          tingkat risiko dan efektifitas mitigasi.
        </p>
      </div>
    );
  }

  const scoreClassification = resolveRiskAssessmentClassification(nilaiBaru);
  const levelBaru = scoreClassification.level;
  const bobot = getBobot(probability, impact);
  const { currentScore, newScore, delta, isStable, isDecrease } =
    resolveAssessmentScoreComparison({
      currentInherentScore,
      currentNilai: nilaiCurrent,
      newNilai: nilaiBaru,
    });

  const TrendIcon = isStable ? Minus : isDecrease ? TrendingDown : TrendingUp;
  const trendColorClass = isStable
    ? "text-muted-foreground"
    : isDecrease
      ? "text-success"
      : "text-risk-extreme";

  const normalizedTargetScore = Math.round(targetScore);
  let progress = 0;

  if (normalizedTargetScore > 0) {
    if (newScore <= normalizedTargetScore) {
      progress = 100;
    } else if (
      currentScore > normalizedTargetScore &&
      newScore < currentScore
    ) {
      const rawProgress =
        ((currentScore - newScore) / (currentScore - normalizedTargetScore)) *
        100;
      progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
    } else {
      progress = 0;
    }
  }

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
            <dt className="text-xs text-muted-foreground">Skor risiko</dt>
            <dd className="flex items-center gap-2 text-right">
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                {newScore}
              </span>
              <Badge
                tone={riskLevelTone}
                size="compact"
              >
                {getRiskLevelLabel(levelBaru)}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-xs text-muted-foreground">Bobot</dt>
            <dd className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {bobot.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-xs text-muted-foreground">Prioritas</dt>
            <dd className="text-xs font-semibold tabular-nums text-foreground">
              {scoreClassification.priority}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-xs text-muted-foreground">Selera risiko</dt>
            <dd>
              <Badge
                tone={
                  scoreClassification.appetite === "di_atas_batas"
                    ? "warning"
                    : "success"
                }
                size="compact"
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
        <div className="flex items-center justify-between gap-3">
          <h3
            id="monitoring-score-change"
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70"
          >
            Perubahan Skor
          </h3>
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trendColorClass,
            )}
          >
            <TrendIcon className="size-3.5" />
            {delta > 0 ? "+" : ""}
            {Math.round(delta)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {currentScore} &rarr; {newScore}
          </span>
        </div>
        {targetScore > 0 && (
          <div
            role="group"
            aria-label="Progres target"
            className="mt-4"
          >
            <div className="text-right">
              <span className="text-xs font-medium tabular-nums text-foreground">
                {newScore} / {normalizedTargetScore}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="w-8 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {newScore <= normalizedTargetScore
                ? "Target tercapai"
                : `${Math.max(0, newScore - normalizedTargetScore)} di atas target`}
            </p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="monitoring-risk-evaluation"
        className="border-t border-dashed border-border/50 pt-3.5"
      >
        <h3
          id="monitoring-risk-evaluation"
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70"
        >
          Evaluasi
        </h3>
        <dl className="mt-3">
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-xs text-muted-foreground">Tingkat risiko</dt>
            <dd
              className={cn(
                "whitespace-nowrap text-right text-xs font-medium",
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
            <dt className="text-xs text-muted-foreground">Efektivitas</dt>
            <dd>
              <Badge
                tone={efektifitasLabel === "Efektif" ? "success" : "danger"}
                size="compact"
              >
                {efektifitasLabel}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
