import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  getBobot,
  levelToColor,
  getSimpulanEfektifitasColor,
  getSimpulanEfektifitas,
} from "@/lib/risk";

export interface SimpulanCardProps {
  nilaiCurrent: number;
  nilaiBaru: number;
  targetScore?: number;
  probability?: number;
  impact?: number;
}

export function SimpulanCard({
  nilaiCurrent,
  nilaiBaru,
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

  const levelBaru = getRiskLevelFromNilai(nilaiBaru);
  const bobot = getBobot(probability, impact);
  const prioritas = Math.round(nilaiBaru / 10) || 1;
  const levelColorClass = levelToColor(levelBaru);
  const isStable = nilaiBaru === nilaiCurrent;
  const isDecrease = nilaiBaru < nilaiCurrent;

  const delta = nilaiBaru - nilaiCurrent;
  const deltaPercent =
    nilaiCurrent > 0 ? Math.round((delta / nilaiCurrent) * 100) : 0;

  const TrendIcon = isStable ? Minus : isDecrease ? TrendingDown : TrendingUp;
  const trendColorClass = isStable
    ? "text-muted-foreground"
    : isDecrease
      ? "text-success"
      : "text-risk-extreme";

  const progress =
    targetScore > 0 && nilaiCurrent !== targetScore
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((nilaiCurrent - nilaiBaru) / (nilaiCurrent - targetScore)) * 100,
            ),
          ),
        )
      : 0;

  const efektifitasColor = getSimpulanEfektifitasColor(nilaiCurrent, nilaiBaru);
  const efektifitasLabel = getSimpulanEfektifitas(nilaiCurrent, nilaiBaru);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border p-4",
          levelColorClass,
        )}
      >
        <div className="text-left">
          <p className="text-xs font-semibold">Hasil Pemantauan</p>
          <p className="text-xs opacity-80 mt-1">
            Bobot: {bobot.toFixed(2)} | Prioritas: {prioritas}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{getRiskLevelLabel(levelBaru)}</p>
          <p className="text-xs font-mono opacity-80">
            Skor Risiko: {Math.round(nilaiBaru)}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Tingkat Risiko
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {Math.round(nilaiCurrent)} &rarr; {Math.round(nilaiBaru)}
              </span>
              <span
                className={cn(
                  "text-xs flex items-center font-medium",
                  trendColorClass,
                )}
              >
                <TrendIcon className="size-3.5 mr-1" />({delta > 0 ? "+" : ""}
                {Math.round(delta)}, {deltaPercent > 0 ? "+" : ""}
                {deltaPercent}%)
              </span>
            </div>
          </div>

          {targetScore > 0 && (
            <div className="border-t border-border/50 pt-4">
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  vs Target Penurunan
                </p>
                <div className="text-right">
                  <span className="text-xs font-medium text-foreground">
                    {Math.round(nilaiBaru)} / {Math.round(targetScore)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({Math.max(0, Math.round(nilaiBaru - targetScore))} selisih)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                  {progress}%
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Efektifitas Penanganan
            </p>
            <Badge
              variant="outline"
              className={cn("border-transparent font-medium", efektifitasColor)}
            >
              {efektifitasLabel}
            </Badge>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
