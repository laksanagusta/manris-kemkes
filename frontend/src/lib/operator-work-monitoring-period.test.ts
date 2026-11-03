import test from "node:test";
import assert from "node:assert/strict";
import { getWorkMonitoringPeriod } from "./operator-work-monitoring-period";

test("the monitored quarter and entry month remain distinct throughout the open window", () => {
  for (const today of ["2026-10-01", "2026-10-31"]) {
    const period = getWorkMonitoringPeriod(today);
    assert.equal(period?.cycle, "2026-Q3");
    assert.equal(period?.label, "Triwulan III 2026");
    assert.equal(period?.isOpen, true);
    assert.match(period?.windowLabel ?? "", /Oktober 2026/);
    assert.equal(period?.next, null);
  }
});

test("closing a window exposes the next schedule, including a change of year", () => {
  const period = getWorkMonitoringPeriod("2026-11-01");
  assert.equal(period?.cycle, "2026-Q3");
  assert.equal(period?.isOpen, false);
  assert.equal(period?.next?.cycle, "2026-Q4");
  assert.match(period?.next?.windowLabel ?? "", /Januari 2027/);
});

test("January monitors the previous year's final quarter; February points to April", () => {
  const january = getWorkMonitoringPeriod("2027-01-01");
  assert.equal(january?.cycle, "2026-Q4");
  assert.equal(january?.isOpen, true);
  const february = getWorkMonitoringPeriod("2027-02-01");
  assert.equal(february?.cycle, "2026-Q4");
  assert.equal(february?.isOpen, false);
  assert.equal(february?.next?.cycle, "2027-Q1");
  assert.match(february?.next?.windowLabel ?? "", /April 2027/);
});

test("every quarter uses its first following month and invalid dates do not invent a schedule", () => {
  for (const [today, cycle] of [["2026-04-30", "2026-Q1"], ["2026-07-31", "2026-Q2"]]) {
    const period = getWorkMonitoringPeriod(today);
    assert.equal(period?.cycle, cycle);
    assert.equal(period?.isOpen, true);
  }
  for (const today of ["", "2026-02-30", "2026-13-01", "2026-2-1", "invalid"]) {
    assert.equal(getWorkMonitoringPeriod(today), null);
  }
});
