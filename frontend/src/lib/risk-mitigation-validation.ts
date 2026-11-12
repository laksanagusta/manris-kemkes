type MitigationPlan = {
  action?: string;

};

export function getMitigationActionErrors(errors: unknown): Array<string | undefined> {
  if (!Array.isArray(errors)) return [];
  return errors.map(
    (item: { action?: { message?: string } } | undefined) => item?.action?.message,
  );
}

export function requiresRiskMitigationPlan(
  score: number,
  treatmentOption?: string,
): boolean {
  return score >= 10 && treatmentOption === "mitigate";
}

export function getRiskMitigationRequirementError(
  score: number,
  treatmentOption: string | undefined,
  mitigations: MitigationPlan[],
): string | undefined {
  if (
    requiresRiskMitigationPlan(score, treatmentOption) &&
    !mitigations.some(
      (plan) => Boolean(plan.action?.trim()),
    )
  ) {
    return "Risiko utama dengan pilihan Mitigasi memerlukan minimal satu rencana mitigasi baru.";
  }
  return undefined;
}
