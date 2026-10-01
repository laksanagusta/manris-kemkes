export type AssessmentCycleOption = {
  value: string;
  label: string;
};

function normalizeQuarterCycle(cycle: string) {
  const [yearRaw, quarterRaw] = cycle.split("-");
  const year = Number(yearRaw);
  const quarterMatch = quarterRaw?.match(/^Q([1-4])$/);
  if (!Number.isInteger(year) || !quarterMatch) {
    throw new Error(`invalid assessment cycle: ${cycle}`);
  }
  const quarter = Number(quarterMatch[1]) - 1;
  return { year, quarter };
}

function quarterCycleFromIndex(index: number) {
  const year = Math.floor(index / 4);
  const quarter = (index % 4) + 1;
  return `${year}-Q${quarter}`;
}

export function currentAssessmentCycle(referenceDate = new Date()) {
  const quarter = Math.floor(referenceDate.getMonth() / 3) + 1;
  return `${referenceDate.getFullYear()}-Q${quarter}`;
}

export function currentMonitoringCycle(referenceDate = new Date()) {
  return currentAssessmentCycle(referenceDate);
}

export function isCurrentMonitoringCycleAvailable(referenceDate = new Date()) {
  return referenceDate.getMonth() % 3 === 2;
}

export function shiftAssessmentCycle(cycle: string, delta: number) {
  const { year, quarter } = normalizeQuarterCycle(cycle);
  const index = year * 4 + quarter + delta;
  return quarterCycleFromIndex(index);
}

export function shiftMonitoringCycle(cycle: string, delta: number) {
  return shiftAssessmentCycle(cycle, delta);
}

export function getDefaultMonitoringCycle(
  currentCycle = currentMonitoringCycle(),
  previousCycleStatus?: string | null,
  riskEffectiveCycle?: string | null,
) {
  const previousCycle = shiftMonitoringCycle(currentCycle, -1);
  return isCurrentMonitoringCycleAvailable() &&
    isMonitoringCycleAfterPreviousEligible(
      currentCycle,
      previousCycleStatus,
      riskEffectiveCycle,
    )
    ? currentCycle
    : previousCycle;
}

export function isMonitoringCycleAfterPreviousEligible(
  currentCycle: string,
  previousCycleStatus?: string | null,
  riskEffectiveCycle?: string | null,
  unknownIsEligible = false,
) {
  const normalizedStatus = previousCycleStatus?.trim().toLowerCase();
  if (normalizedStatus === "draft") return false;
  if (normalizedStatus === "final" || normalizedStatus === "finalized") {
    return true;
  }

  const previousCycle = shiftMonitoringCycle(currentCycle, -1);
  if (!riskEffectiveCycle) return unknownIsEligible;
  return isCycleAfter(riskEffectiveCycle, previousCycle);
}

export function isMonitoringCycleApplicable(
  cycle: string,
  riskEffectiveCycle?: string | null,
) {
  if (!riskEffectiveCycle) return true;
  return !isCycleAfter(riskEffectiveCycle, cycle);
}

function isCycleAfter(firstCycle: string, secondCycle: string) {
  try {
    const first = normalizeQuarterCycle(firstCycle);
    const second = normalizeQuarterCycle(secondCycle);
    return first.year * 4 + first.quarter > second.year * 4 + second.quarter;
  } catch {
    return false;
  }
}

export function getSelectableAssessmentCycles(
  currentCycle: string,
): AssessmentCycleOption[] {
  return [-1, 0].map((delta) => {
    const value = shiftAssessmentCycle(currentCycle, delta);
    return {
      value,
      label: value,
    };
  });
}

export function getAssessmentCycleFilterOptions(
  referenceDate = new Date(),
  selectedCycle = "",
): AssessmentCycleOption[] {
  const start = normalizeQuarterCycle("2026-Q2");
  const current = normalizeQuarterCycle(currentAssessmentCycle(referenceDate));
  const cycles: AssessmentCycleOption[] = [];

  for (let year = start.year; year <= current.year; year += 1) {
    const firstQuarter = year === start.year ? start.quarter + 1 : 1;
    const lastQuarter = year === current.year ? current.quarter + 1 : 4;

    for (let quarter = firstQuarter; quarter <= lastQuarter; quarter += 1) {
      const value = `${year}-Q${quarter}`;
      cycles.push({ value, label: value });
    }
  }

  if (selectedCycle && !cycles.some((cycle) => cycle.value === selectedCycle)) {
    cycles.push({ value: selectedCycle, label: selectedCycle });
  }

  return [{ value: "all", label: "Semua Periode" }, ...cycles];
}

export function getSelectableMonitoringCycles(
  currentCycle: string,
): AssessmentCycleOption[] {
  return [-1, 0].map((delta) => {
    const value = shiftMonitoringCycle(currentCycle, delta);
    return {
      value,
      label: value,
    };
  });
}

export function getSelectableMonitoringCyclesForDate(
  referenceDate = new Date(),
): AssessmentCycleOption[] {
  const currentCycle = currentMonitoringCycle(referenceDate);
  const cycles = [shiftMonitoringCycle(currentCycle, -1)];

  if (isCurrentMonitoringCycleAvailable(referenceDate)) {
    cycles.push(currentCycle);
  }

  return cycles.map((value) => ({ value, label: value }));
}
