import assert from "node:assert/strict";
import test from "node:test";
import { isValidMonitoringDate, monitoringCycleForDate, todayMonitoringDate } from "./monitoring-date.ts";

test("observation dates use Jakarta calendar at midnight boundaries", () => {
  assert.equal(todayMonitoringDate(new Date("2027-03-31T17:00:00Z")), "2027-04-01");
  assert.equal(monitoringCycleForDate("2027-04-01"), "2027-Q2");
  assert.equal(monitoringCycleForDate("2027-03-31"), "2027-Q1");
});

test("invalid and future dates are rejected while past observations are allowed", () => {
  const now = new Date("2027-04-08T05:00:00Z");
  assert.equal(isValidMonitoringDate("2027-02-05", now), true);
  assert.equal(isValidMonitoringDate("2027-04-08", now), true);
  assert.equal(isValidMonitoringDate("2027-04-09", now), false);
  assert.equal(monitoringCycleForDate("2027-02-29"), "");
  assert.equal(monitoringCycleForDate("2028-02-29"), "2028-Q1");
  assert.equal(monitoringCycleForDate("2027-Q2"), "");
});
