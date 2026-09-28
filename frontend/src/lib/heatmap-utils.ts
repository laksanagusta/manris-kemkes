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
      sangat_rendah: "heatmap-sangat-rendah",
      rendah: "heatmap-rendah",
      sedang: "heatmap-sedang",
      tinggi: "heatmap-tinggi",
      sangat_tinggi: "heatmap-sangat-tinggi",
    }[level];

    if (count === 0) return cn(colorClass, "opacity-40 font-normal");
    return cn(colorClass, "font-bold");
  }

  // mode === "intensity"
  if (count === 0) return "bg-muted/20 text-muted-foreground";
  if (count <= 2)
    return "bg-primary/15 text-foreground font-semibold";
  if (count <= 5)
    return "bg-primary/30 text-foreground font-bold";
  return "bg-primary/50 font-bold text-foreground";
}
