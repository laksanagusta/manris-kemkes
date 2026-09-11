import { roundRiskScore } from "./risk.js";

type AssessmentScoreComparisonInput = {
  currentInherentScore?: number | null;
  currentNilai?: number | null;
  newNilai: number;
};

function hasNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

export function resolveAssessmentScoreComparison({
  currentInherentScore,
  currentNilai,
  newNilai,
}: AssessmentScoreComparisonInput) {
  const currentScore = hasNumber(currentInherentScore)
    ? roundRiskScore(currentInherentScore) ?? 0
    : roundRiskScore(currentNilai) ?? 0;
  const newScore = roundRiskScore(newNilai) ?? 0;
  const delta = newScore - currentScore;
  const deltaPercent =
    currentScore > 0 ? Math.round((delta / currentScore) * 100) : 0;

  return {
    currentScore,
    newScore,
    delta,
    deltaPercent,
    isStable: delta === 0,
    isDecrease: delta < 0,
  };
}
