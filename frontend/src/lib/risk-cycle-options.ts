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

function semesterCycleFromIndex(index: number) {
  const year = Math.floor(index / 2);
  const half = index % 2 === 0 ? "H1" : "H2";
  return `${year}-${half}`;
}

function quarterCycleFromIndex(index: number) {
  const year = Math.floor(index / 4);
  const quarter = (index % 4) + 1;
  return `${year}-Q${quarter}`;
}

export function currentAssessmentCycle(referenceDate = new Date()) {
  const month = referenceDate.getMonth();
  const half = month < 6 ? "H1" : "H2";
  return `${referenceDate.getFullYear()}-${half}`;
}

export function currentMonitoringCycle(referenceDate = new Date()) {
  const month = referenceDate.getMonth();
  let quarter: string;
  if (month < 3) {
    quarter = "Q1";
  } else if (month < 6) {
    quarter = "Q2";
  } else if (month < 9) {
    quarter = "Q3";
  } else {
    quarter = "Q4";
  }
  return `${referenceDate.getFullYear()}-${quarter}`;
}

export function shiftAssessmentCycle(cycle: string, delta: number) {
  const { year, half } = normalizeSemesterCycle(cycle);
  const index = year * 2 + half + delta;
  return semesterCycleFromIndex(index);
}

export function shiftMonitoringCycle(cycle: string, delta: number) {
  const { year, quarter } = normalizeQuarterCycle(cycle);
  const index = year * 4 + quarter + delta;
  return quarterCycleFromIndex(index);
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
