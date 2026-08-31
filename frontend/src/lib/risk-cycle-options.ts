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
      label: `${value} — ${delta === 0 ? "periode berjalan" : "periode sebelumnya"}`,
    };
  });
}
