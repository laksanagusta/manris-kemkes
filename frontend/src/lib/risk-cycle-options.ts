export type AssessmentCycleOption = {
  value: string;
  label: string;
};

function normalizeCycle(cycle: string) {
  const [yearRaw, halfRaw] = cycle.split("-");
  const year = Number(yearRaw);
  const half = halfRaw === "H2" ? 1 : 0;

  if (!Number.isInteger(year) || (halfRaw !== "H1" && halfRaw !== "H2")) {
    throw new Error(`invalid assessment cycle: ${cycle}`);
  }

  return { year, half };
}

function cycleFromIndex(index: number) {
  const year = Math.floor(index / 2);
  const half = index % 2 === 0 ? "H1" : "H2";
  return `${year}-${half}`;
}

export function currentAssessmentCycle(referenceDate = new Date()) {
  const half = referenceDate.getMonth() < 6 ? "H1" : "H2";
  return `${referenceDate.getFullYear()}-${half}`;
}

export function shiftAssessmentCycle(cycle: string, delta: number) {
  const { year, half } = normalizeCycle(cycle);
  const index = year * 2 + half + delta;
  return cycleFromIndex(index);
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
