import type { WorkingPaperRiskData } from "@/types/working-paper";
import type { RiskLevel } from "@/types/risk";

export type WorkingPaperRiskDisplay = {
  score: number;
  level: RiskLevel;
  label: string;
};

function getWorkingPaperRiskLevel(score: number): RiskLevel {
  if (score >= 20) return "sangat_tinggi";
  if (score >= 15) return "tinggi";
  if (score >= 10) return "sedang";
  if (score >= 5) return "rendah";
  return "sangat_rendah";
}

function getWorkingPaperRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    sangat_rendah: "Sangat Rendah",
    rendah: "Rendah",
    sedang: "Sedang",
    tinggi: "Tinggi",
    sangat_tinggi: "Sangat Tinggi",
  };

  return labels[level];
}

export function resolveWorkingPaperRiskDisplay(
  risk: WorkingPaperRiskData,
): WorkingPaperRiskDisplay {
  const score = typeof risk.nilai === "number" ? Math.round(risk.nilai) : 0;
  const level = getWorkingPaperRiskLevel(score);

  return {
    score,
    level,
    label: getWorkingPaperRiskLevelLabel(level),
  };
}
