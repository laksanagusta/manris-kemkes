export type AssessmentCycleOption = {
  value: string;
  label: string;
};

function normalizeSemesterCycle(cycle: string) {
  const [yearRaw, halfRaw] = cycle.split("-");
  const year = Number(yearRaw);
  const halfMatch = halfRaw?.match(/^H([12])$/);
  if (!Number.isInteger(year) || !halfMatch) {
    throw new Error(`invalid assessment cycle: ${cycle}`);
  }
  const half = Number(halfMatch[1]) - 1;
  return { year, half };
}

function semesterCycleFromIndex(index: number) {
  const year = Math.floor(index / 2);
  const half = index % 2 === 0 ? "H1" : "H2";
  return `${year}-${half}`;
}

export function currentAssessmentCycle(referenceDate = new Date()) {
  const month = referenceDate.getMonth();
  const half = month < 6 ? "H1" : "H2";
  return `${referenceDate.getFullYear()}-${half}`;
}

export function currentMonitoringCycle(referenceDate = new Date()) {
  return currentAssessmentCycle(referenceDate);
}

export function shiftAssessmentCycle(cycle: string, delta: number) {
  const { year, half } = normalizeSemesterCycle(cycle);
  const index = year * 2 + half + delta;
  return semesterCycleFromIndex(index);
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
      label: value,
    };
  });
}
