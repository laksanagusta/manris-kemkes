type MitigationPlan = {
  action?: string;
  isExistingControl?: boolean;
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
      (plan) => !plan.isExistingControl && Boolean(plan.action?.trim()),
    )
  ) {
    return "Risiko utama dengan pilihan Mitigasi memerlukan minimal satu rencana mitigasi baru.";
  }
  return undefined;
}
