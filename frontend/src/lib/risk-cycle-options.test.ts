import test from "node:test";
import assert from "node:assert/strict";

import {
  getAssessmentCycleFilterOptions,
  currentAssessmentCycle,
  currentMonitoringCycle,
  getSelectableAssessmentCycles,
  getSelectableMonitoringCycles,
  shiftAssessmentCycle,
  shiftMonitoringCycle,
} from "./risk-cycle-options.ts";

test("shiftAssessmentCycle moves across quarters", () => {
  assert.equal(shiftAssessmentCycle("2026-Q2", -1), "2026-Q1");
  assert.equal(shiftAssessmentCycle("2026-Q4", 1), "2027-Q1");
});

test("getSelectableAssessmentCycles returns adjacent quarters", () => {
  assert.deepEqual(getSelectableAssessmentCycles("2026-Q2"), [
    { value: "2026-Q1", label: "2026-Q1" },
    { value: "2026-Q2", label: "2026-Q2" },
  ]);
});

test("getAssessmentCycleFilterOptions lists available quarters and keeps the selected cycle", () => {
  assert.deepEqual(
    getAssessmentCycleFilterOptions(new Date("2026-10-01T00:00:00Z")),
    [
      { value: "all", label: "Semua Periode" },
      { value: "2026-Q2", label: "2026-Q2" },
      { value: "2026-Q3", label: "2026-Q3" },
      { value: "2026-Q4", label: "2026-Q4" },
    ],
  );
  assert.deepEqual(
    getAssessmentCycleFilterOptions(
      new Date("2026-10-01T00:00:00Z"),
      "2025-Q4",
    ).at(-1),
    { value: "2025-Q4", label: "2025-Q4" },
  );
});

test("currentAssessmentCycle follows date", () => {
  assert.equal(currentAssessmentCycle(new Date("2026-01-15T00:00:00Z")), "2026-Q1");
  assert.equal(currentAssessmentCycle(new Date("2026-04-01T00:00:00Z")), "2026-Q2");
  assert.equal(currentAssessmentCycle(new Date("2026-07-01T00:00:00Z")), "2026-Q3");
  assert.equal(currentAssessmentCycle(new Date("2026-10-01T00:00:00Z")), "2026-Q4");
});

test("shiftMonitoringCycle moves across quarters", () => {
  assert.equal(shiftMonitoringCycle("2026-Q2", -1), "2026-Q1");
  assert.equal(shiftMonitoringCycle("2026-Q4", 1), "2027-Q1");
});

test("getSelectableMonitoringCycles returns adjacent quarters", () => {
  assert.deepEqual(getSelectableMonitoringCycles("2026-Q2"), [
    { value: "2026-Q1", label: "2026-Q1" },
    { value: "2026-Q2", label: "2026-Q2" },
  ]);
});

test("currentMonitoringCycle follows date", () => {
  assert.equal(currentMonitoringCycle(new Date("2026-01-15T00:00:00Z")), "2026-Q1");
  assert.equal(currentMonitoringCycle(new Date("2026-04-01T00:00:00Z")), "2026-Q2");
  assert.equal(currentMonitoringCycle(new Date("2026-07-01T00:00:00Z")), "2026-Q3");
  assert.equal(currentMonitoringCycle(new Date("2026-10-01T00:00:00Z")), "2026-Q4");
});
