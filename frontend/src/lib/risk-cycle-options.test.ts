import test from "node:test";
import assert from "node:assert/strict";

import {
  currentAssessmentCycle,
  getSelectableAssessmentCycles,
  shiftAssessmentCycle,
} from "./risk-cycle-options";

test("shiftAssessmentCycle moves across semesters", () => {
  assert.equal(shiftAssessmentCycle("2026-H2", -1), "2026-H1");
  assert.equal(shiftAssessmentCycle("2026-H2", 1), "2027-H1");
});

test("getSelectableAssessmentCycles returns adjacent semesters", () => {
  assert.deepEqual(getSelectableAssessmentCycles("2026-H2"), [
    { value: "2026-H1", label: "2026-H1" },
    { value: "2026-H2", label: "2026-H2" },
  ]);
});

test("currentAssessmentCycle follows date", () => {
  assert.equal(currentAssessmentCycle(new Date("2026-03-01T00:00:00Z")), "2026-H1");
  assert.equal(currentAssessmentCycle(new Date("2026-08-01T00:00:00Z")), "2026-H2");
});
