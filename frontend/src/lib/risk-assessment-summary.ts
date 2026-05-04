type AssessmentScoreComparisonInput = {
  currentInherentScore?: number | null;
  currentNilai?: number | null;
  newNilai: number;
};

function hasNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !Number.isNaN(value);
}

export function resolveAssessmentScoreComparison({
  currentInherentScore,
  currentNilai,
  newNilai,
}: AssessmentScoreComparisonInput) {
  const currentScore = hasNumber(currentInherentScore)
    ? currentInherentScore
    : Math.round(currentNilai ?? 0);
  const newScore = Math.round(newNilai);
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
