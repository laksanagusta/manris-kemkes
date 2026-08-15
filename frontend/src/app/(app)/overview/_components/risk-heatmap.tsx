"use client";

import { useMemo } from "react";
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeatmapVelocityCell } from "@/types/risk";
import { getBobot, calculateNilai, getRiskLevelFromNilai } from "@/lib/risk";

const impactLabels = ["Tidak Signifikan", "Kecil", "Sedang", "Besar", "Katastropik"];
const likelihoodLabels = ["Jarang", "Kemungkinan Kecil", "Kemungkinan Sedang", "Kemungkinan Besar", "Hampir Pasti Terjadi"];

const heatmapLevelColors: Record<string, string> = {
  sangat_rendah: "heatmap-sangat-rendah",
  rendah: "heatmap-rendah",
  sedang: "heatmap-sedang",
  tinggi: "heatmap-tinggi",
  sangat_tinggi: "heatmap-sangat-tinggi",
};

function getRiskLevelFromMatrix(probIndex: number, impactIndex: number): string {
  const prob = probIndex + 1;
  const impact = impactIndex + 1;
  const bobot = getBobot(prob, impact);
  const nilai = calculateNilai(prob, impact, bobot);
  return getRiskLevelFromNilai(nilai);
}

interface RiskHeatmapProps {
  data: number[][];
  loading?: boolean;
  error?: boolean;
  velocityData?: HeatmapVelocityCell[];
  compact?: boolean;
  showLegend?: boolean;
}

function getVelocityDirection(cell: HeatmapVelocityCell | undefined): "up" | "down" | "stable" | "none" {
  if (!cell || (cell.upCount === 0 && cell.downCount === 0 && cell.stableCount === 0 && cell.newCount === 0)) return "none";
  if (cell.upCount > cell.downCount) return "up";
  if (cell.downCount > cell.upCount) return "down";
  return "stable";
}

export function RiskHeatmap({
  data,
  loading,
  error,
  velocityData,
  compact = false,
  showLegend = true,
}: RiskHeatmapProps) {
  const velocityMap = useMemo(() => {
    const map = new Map<string, HeatmapVelocityCell>();
    if (velocityData) {
      for (const cell of velocityData) {
        map.set(`${cell.probability}-${cell.impact}`, cell);
      }
    }
    return map;
  }, [velocityData]);

  if (loading) {
    return (
      <Card
        className={cn(
          "bg-card/80 backdrop-blur-sm",
          !compact && "lg:col-span-3",
        )}
        data-testid="heatmap-grid"
      >
        <CardContent className={cn("flex items-center justify-center text-sm text-muted-foreground", compact ? "h-44" : "h-64")}>
          Memuat heatmap...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          "bg-card/80 backdrop-blur-sm",
          !compact && "lg:col-span-3",
        )}
        data-testid="heatmap-grid"
      >
        <CardContent
          className={cn(
            "flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground",
            compact ? "h-44" : "h-64",
          )}
        >
          Data heatmap tidak tersedia saat ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "bg-card/80 backdrop-blur-sm",
        !compact && "lg:col-span-3",
      )}
      data-testid="heatmap-grid"
    >
      <CardHeader className={cn(compact ? "pb-2" : "pb-4")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
              Heatmap Risiko
            </CardTitle>
            <p className={cn("mt-1 text-xs text-muted-foreground", compact && "max-w-[18rem]")}>
              Distribusi risiko berdasarkan Probabilitas × Dampak
            </p>
          </div>
          {!compact ? (
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
              Detail
              <ArrowUpRight className="size-3" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-0", compact && "pb-4")}>
        <div className={cn("flex gap-2", compact && "gap-1.5")}>
          {!compact ? (
            <>
              <div className="-mr-1 flex shrink-0 flex-col items-center justify-center">
                <span className="rotate-180 text-[9px] font-semibold tracking-widest text-muted-foreground [writing-mode:vertical-lr]">
                  PROBABILITAS
                </span>
              </div>

              <div className="flex shrink-0 flex-col justify-end gap-[3px] pb-[22px]">
                {[...likelihoodLabels].reverse().map((label) => (
                  <div key={label} className="flex h-0 flex-1 items-center justify-end pr-1.5">
                    <span className="w-14 truncate text-right text-[8px] leading-none text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className={cn("grid grid-rows-5 gap-[3px]", compact && "gap-[2px]")}>
              {[...data].reverse().map((row, rowIdx) => (
                <div key={rowIdx} className={cn("grid grid-cols-5 gap-[3px]", compact && "gap-[2px]")}>
                  {row.map((count, colIdx) => {
                    const prob = 4 - rowIdx;
                    const impact = colIdx;
                    const level = getRiskLevelFromMatrix(prob, impact);
                    const velocityCell = velocityMap.get(`${prob}-${impact}`);
                    const direction = getVelocityDirection(velocityCell);

                    return (
                      <div
                        key={colIdx}
                        data-testid="heatmap-cell"
                        className={cn(
                          "relative flex items-center justify-center rounded-md text-xs font-bold transition-all hover:shadow-md",
                          compact ? "aspect-square hover:scale-[1.03]" : "aspect-[4/3] hover:scale-[1.08]",
                          heatmapLevelColors[level],
                        )}
                      >
                        <span className={cn(compact && "text-[10px]")}>{count > 0 ? count : ""}</span>
                        {direction !== "none" && count > 0 && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full">
                            {direction === "up" && <TrendingUp className="size-2.5 text-risk-high" />}
                            {direction === "down" && <TrendingDown className="size-2.5 text-success" />}
                            {direction === "stable" && <Minus className="size-2.5 text-muted-foreground" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {!compact ? (
              <>
                <div className="mt-1 grid grid-cols-5 gap-[3px]">
                  {impactLabels.map((label) => (
                    <div key={label} className="truncate text-center text-[9px] leading-tight text-muted-foreground">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-center text-[9px] font-semibold tracking-widest text-muted-foreground">
                  DAMPAK →
                </div>
              </>
            ) : null}
          </div>
        </div>

        {showLegend && !compact ? (
          <div className="mt-3 flex items-center justify-center gap-3 border-t border-border/40 pt-3">
            {[
              { label: "Sangat Rendah", cls: "heatmap-sangat-rendah" },
              { label: "Rendah", cls: "heatmap-rendah" },
              { label: "Sedang", cls: "heatmap-sedang" },
              { label: "Tinggi", cls: "heatmap-tinggi" },
              { label: "Sangat Tinggi", cls: "heatmap-sangat-tinggi" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={cn("size-2.5 rounded-[3px]", item.cls)} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
