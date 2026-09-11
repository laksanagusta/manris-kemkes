import { getHeatmapCellClass, type HeatmapMode } from "@/lib/heatmap-utils";
import {
  calculateNilai,
  getBobot,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskHeatmapGrid({
  matrix,
  label,
  mode = "riskLevel",
  className,
}: {
  matrix: number[][];
  label: string;
  mode?: HeatmapMode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid grid-cols-5 gap-1", className)}
    >
      {[...matrix].reverse().flatMap((row, rowIndex) =>
        row.map((count, colIndex) => {
          const probability = 5 - rowIndex;
          const impact = colIndex + 1;
          const level = getRiskLevelLabel(
            getRiskLevelFromNilai(
              calculateNilai(
                probability,
                impact,
                getBobot(probability, impact),
              ),
            ),
          );

          return (
            <div
              key={`${probability}-${impact}`}
              role="img"
              aria-label={`Probabilitas ${probability}, dampak ${impact}, level ${level}, ${count} risiko`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                getHeatmapCellClass(
                  count,
                  probability,
                  impact,
                  mode,
                ),
              )}
            >
              <span aria-hidden="true">
                {mode === "riskLevel" && count === 0 ? "" : count}
              </span>
            </div>
          );
        }),
      )}
    </div>
  );
}
