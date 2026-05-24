import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskAssessmentSummaryStrip } from "@/components/shared/risk-assessment-summary-strip";
import {
  getBobot,
  getSimpulanEfektifitasColor,
  getSimpulanEfektifitas,
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
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Pilih probabilitas dan dampak terlebih dahulu untuk melihat simpulan
            tingkat risiko dan efektifitas mitigasi.
          </p>
        </CardContent>
      </Card>
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
  let progressLabel = "Kedekatan ke Target";

  if (normalizedTargetScore > 0) {
    if (newScore <= normalizedTargetScore) {
      progress = 100;
      progressLabel = "Target tercapai";
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
      progressLabel = "Masih di atas target";
    }
  }

  const efektifitasColor = getSimpulanEfektifitasColor(currentScore, newScore);
  const efektifitasLabel = getSimpulanEfektifitas(currentScore, newScore);
  const trendLabel = isStable ? "Stabil" : isDecrease ? "Turun" : "Naik";
  const trendTone = isStable ? "neutral" : isDecrease ? "success" : "warning";

  return (
    <div className="space-y-3">
      <RiskAssessmentSummaryStrip
        title="Hasil Pemantauan"
        score={newScore}
        level={levelBaru}
        scoreLabel="Skor risiko"
        statusLabel={trendLabel}
        statusTone={trendTone}
        helperText="Ringkasan otomatis dari skor sebelumnya dan perhitungan ulang berdasarkan probabilitas serta dampak."
      metrics={[
        {
          label: "Bobot",
          value: (
            <span className="font-mono tabular-nums">{bobot.toFixed(2)}</span>
          ),
        },
        {
          label: "Prioritas",
          value: <span className="tabular-nums">{scoreClassification.priority}</span>,
        },
        {
          label: "Selera",
          value: (
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] font-semibold tracking-[0.12em]",
                scoreClassification.appetite === "di_atas_batas"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              {scoreClassification.appetite === "di_atas_batas"
                ? "Di Atas Batas"
                : "Dalam Batas"}
            </Badge>
          ),
        },
      ]}
      />

      <div className="rounded-xl border border-border/50 bg-background p-4">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Perubahan Skor
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {currentScore} &rarr; {newScore}
              </span>
              <span
                className={cn(
                  "text-xs flex items-center font-medium",
                  trendColorClass,
                )}
              >
                <TrendIcon className="mr-1 size-3.5" />({delta > 0 ? "+" : ""}
                {Math.round(delta)})
              </span>
            </div>
          </div>

          {targetScore > 0 && (
            <div className="border-t border-border/50 pt-4">
              <div className="mb-2 flex items-end justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {progressLabel}
                </p>
                <div className="text-right">
                  <span className="text-xs font-medium text-foreground">
                    {newScore} / {normalizedTargetScore}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({Math.max(0, newScore - normalizedTargetScore)} selisih)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="w-8 text-right text-xs font-medium text-muted-foreground">
                  {progress}%
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-border/50 pt-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Status Tingkat Risiko
            </p>
            <p
              className={cn(
                "text-xs font-medium",
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
            </p>
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Efektivitas
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent font-medium",
                  efektifitasColor,
                )}
              >
                {efektifitasLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
