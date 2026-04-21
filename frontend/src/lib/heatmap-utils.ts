import { cn } from "@/lib/utils";
import { getBobot, calculateNilai, getRiskLevelFromNilai } from "@/lib/risk";

export type HeatmapMode = "intensity" | "riskLevel";

export function getHeatmapCellClass(
  count: number,
  prob: number,
  impact: number,
  mode: HeatmapMode,
): string {
  if (mode === "riskLevel") {
    const bobot = getBobot(prob, impact);
    const nilai = calculateNilai(prob, impact, bobot);
    const level = getRiskLevelFromNilai(nilai);
    const colorClass = {
      sangat_rendah: "heatmap-sangat-rendah border-transparent",
      rendah: "heatmap-rendah border-transparent",
      sedang: "heatmap-sedang border-transparent",
      tinggi: "heatmap-tinggi border-transparent",
      sangat_tinggi: "heatmap-sangat-tinggi border-transparent",
    }[level];

    if (count === 0) return cn(colorClass, "opacity-40 font-normal");
    return cn(colorClass, "font-bold");
  }

  // mode === "intensity"
  if (count === 0) return "border-border bg-muted/20 text-muted-foreground";
  if (count <= 2)
    return "border-primary/20 bg-primary/15 text-foreground font-semibold";
  if (count <= 5)
    return "border-primary/30 bg-primary/30 text-foreground font-bold";
  return "border-primary/40 bg-primary/50 font-bold text-foreground";
}
