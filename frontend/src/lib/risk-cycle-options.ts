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
  return isMonitoringCycleAfterPreviousEligible(
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
