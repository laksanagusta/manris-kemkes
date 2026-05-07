import { getRiskLevelFromNilai, getRiskLevelLabel } from "./risk.ts";

import type { WorkingPaperRiskData } from "../types/working-paper";
import type { RiskLevel } from "../types/risk";

export type WorkingPaperRiskDisplay = {
  score: number;
  level: RiskLevel;
  label: string;
};

export function resolveWorkingPaperRiskDisplay(
  risk: WorkingPaperRiskData,
): WorkingPaperRiskDisplay {
  const fallbackScore = typeof risk.nilai === "number" ? Math.round(risk.nilai) : 0;
  const score =
    typeof risk.inherentScore === "number" ? risk.inherentScore : fallbackScore;
  const level = getRiskLevelFromNilai(score);

  return {
    score,
    level,
    label: getRiskLevelLabel(level),
  };
}
