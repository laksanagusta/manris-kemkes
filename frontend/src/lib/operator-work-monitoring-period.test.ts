import test from "node:test";
import assert from "node:assert/strict";
import { getWorkMonitoringPeriod } from "./operator-work-monitoring-period.ts";

test("work banner groups observations by the current quarter without entry windows", () => {
  for (const date of ["2026-10-01", "2026-11-01", "2026-12-31"]) {
    const period = getWorkMonitoringPeriod(date);
    assert.equal(period?.cycle, "2026-Q4");
    assert.equal(period?.label, "Triwulan IV 2026");
    assert.equal(period?.isOpen, true);
    assert.equal(period?.next, null);
  }
  assert.equal(getWorkMonitoringPeriod("2027-01-01")?.cycle, "2027-Q1");
  assert.equal(getWorkMonitoringPeriod("2027-04-01")?.cycle, "2027-Q2");
});

test("invalid calendar dates never invent reporting context", () => {
  for (const value of ["", "2026-02-30", "2026-13-01", "2026-2-1", "invalid"]) {
    assert.equal(getWorkMonitoringPeriod(value), null);
  }
});
