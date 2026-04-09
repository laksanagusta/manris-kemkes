"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getBobot,
  calculateNilai,
  getRiskLevelFromNilai,
  getRiskLevelDisplayLabel,
  getLevelBadgeClasses,
  getScoreBtnColorClasses,
  levelToColor,
} from "@/lib/risk";

const PROBABILITY_SCORES = {
  1: { label: "Sangat Jarang", desc: "Hampir tidak mungkin terjadi (< 10%)" },
  2: { label: "Jarang", desc: "Kemungkinan kecil terjadi (10-30%)" },
  3: { label: "Kadang-kadang", desc: "Mungkin terjadi (30-50%)" },
  4: { label: "Sering", desc: "Kemungkinan besar terjadi (50-70%)" },
  5: { label: "Sangat Sering", desc: "Hampir pasti terjadi (> 70%)" },
} as const;

const IMPACT_SCORES = {
  1: { label: "Sangat Ringan", desc: "Tidak ada dampak signifikan pada operasi" },
  2: { label: "Ringan", desc: "Dampak kecil, mudah ditangani" },
  3: { label: "Sedang", desc: "Dampak moderat, memerlukan perhatian" },
  4: { label: "Berat", desc: "Dampak signifikan, mengganggu operasi" },
  5: { label: "Sangat Berat", desc: "Dampak besar, mengancam kelangsungan" },
} as const;

interface ReviewScoringGridProps {
  reviewedProbability: number | null;
  reviewedImpact: number | null;
  onProbabilityChange: (val: number) => void;
  onImpactChange: (val: number) => void;
  disabled?: boolean;
  showWeightedCalculation?: boolean;
}

export function ReviewScoringGrid({
  reviewedProbability,
  reviewedImpact,
  onProbabilityChange,
  onImpactChange,
  disabled = false,
  showWeightedCalculation = true,
}: ReviewScoringGridProps) {
  const { nilai, inherentScore, level, weight } = useMemo(() => {
    if (reviewedProbability && reviewedImpact) {
      const w = getBobot(reviewedProbability, reviewedImpact);
      const n = calculateNilai(reviewedProbability, reviewedImpact, w);
      const score = Math.round(n);
      const lvl = getRiskLevelFromNilai(n);
      return {
        nilai: n,
        inherentScore: score,
        level: getRiskLevelDisplayLabel(lvl),
        weight: w,
      };
    }
    return { nilai: null, inherentScore: null, level: null, weight: null };
  }, [reviewedProbability, reviewedImpact]);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Probabilitas</Label>
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((val) => {
              const scoreInfo = PROBABILITY_SCORES[val as keyof typeof PROBABILITY_SCORES];
              const selectedLevel = reviewedProbability && reviewedImpact
                ? getRiskLevelFromNilai(calculateNilai(reviewedProbability, reviewedImpact, getBobot(reviewedProbability, reviewedImpact)))
                : null;
              return (
                <Tooltip key={val}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onProbabilityChange(val)}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-semibold transition-colors",
                        val === reviewedProbability && selectedLevel
                          ? `${levelToColor(selectedLevel)} ring-1 font-bold`
                          : val === reviewedProbability
                            ? "bg-primary/10 border-primary text-primary ring-1 font-bold"
                            : "bg-muted/30 hover:bg-muted/50 border-border/60",
                        disabled && "cursor-not-allowed opacity-70 hover:bg-muted/30",
                      )}
                    >
                      {val}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-semibold">{scoreInfo.label}</p>
                      <p className="text-[11px] leading-relaxed">{scoreInfo.desc}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Dampak</Label>
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((val) => {
              const scoreInfo = IMPACT_SCORES[val as keyof typeof IMPACT_SCORES];
              const selectedLevel = reviewedProbability && reviewedImpact
                ? getRiskLevelFromNilai(calculateNilai(reviewedProbability, reviewedImpact, getBobot(reviewedProbability, reviewedImpact)))
                : null;
              return (
                <Tooltip key={val}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onImpactChange(val)}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-semibold transition-colors",
                        val === reviewedImpact && selectedLevel
                          ? `${levelToColor(selectedLevel)} ring-1 font-bold`
                          : val === reviewedImpact
                            ? "bg-primary/10 border-primary text-primary ring-1 font-bold"
                            : "bg-muted/30 hover:bg-muted/50 border-border/60",
                        disabled && "cursor-not-allowed opacity-70 hover:bg-muted/30",
                      )}
                    >
                      {val}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-semibold">{scoreInfo.label}</p>
                      <p className="text-[11px] leading-relaxed">{scoreInfo.desc}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {inherentScore !== null && level !== null && (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border p-4",
            reviewedProbability && reviewedImpact
              ? levelToColor(getRiskLevelFromNilai(calculateNilai(reviewedProbability, reviewedImpact, getBobot(reviewedProbability, reviewedImpact))))
              : "border-border/50 bg-card",
          )}
        >
          <div className="space-y-0.5">
            <p className="text-xs font-semibold">Skor Penilaian</p>
            <p className="text-xs text-muted-foreground">
              Bobot: {weight?.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">
              {level}
            </p>
            <p className="text-xs font-mono">
              {showWeightedCalculation && nilai !== null
                ? `P${reviewedProbability} × D${reviewedImpact} = ${Math.round(nilai)}`
                : `P${reviewedProbability} × D${reviewedImpact}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}