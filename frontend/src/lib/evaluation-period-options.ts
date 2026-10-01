export type EvaluationPeriodOption = {
  value: string;
  label: string;
};

export function getEvaluationPeriodFilterOptions(
  availablePeriods: readonly string[],
  currentPeriodOptions: readonly EvaluationPeriodOption[],
): EvaluationPeriodOption[] {
  const periods = new Set(
    currentPeriodOptions
      .filter((option) => option.value !== "all")
      .map((option) => option.value)
      .concat(
        availablePeriods
          .map((period) => period.trim())
          .filter((period) => period.length > 0 && period !== "all"),
      ),
  );

  return [
    { value: "all", label: "Semua periode" },
    ...Array.from(periods)
      .sort((first, second) =>
        first.localeCompare(second, undefined, { numeric: true }),
      )
      .map((period) => ({ value: period, label: period })),
  ];
}
