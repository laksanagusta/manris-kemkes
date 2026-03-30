import type { RiskLevel } from "@/types/risk";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 17) return "ekstrem";
  if (score >= 10) return "tinggi";
  if (score >= 5) return "sedang";
  return "rendah";
}

export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    rendah: "Rendah",
    sedang: "Sedang",
    tinggi: "Tinggi",
    ekstrem: "Ekstrem",
  };
  return labels[level] || level;
}

export function levelToColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
    sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
    tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
    ekstrem: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  };
  return colors[level] || "";
}
