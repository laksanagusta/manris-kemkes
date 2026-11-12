import assert from "node:assert/strict";
import test from "node:test";
import { getRecentRegisterMonitoring } from "./risk-recent-monitoring.ts";

test("four consecutive quarters roll across the WIB year boundary, preserving gaps", () => {
  const items = getRecentRegisterMonitoring({ recentMonitoring: [
    { cycle: "2026-Q3", status: "final", nilai: 12 },
    { cycle: "2027-Q2", status: "final", nilai: 20 },
  ] }, new Date("2026-12-31T17:00:00Z"));
  assert.deepEqual(items.map(item => item.cycle), ["2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1"]);
  assert.equal(items[1].score, 12);
  assert.equal(items[0].status, undefined);
  assert.equal(items[3].status, undefined);
});

test("legacy current-year quarters are never attributed to the prior year", () => {
  const items = getRecentRegisterMonitoring({ semesterMonitoring: { q4: "final", q4Nilai: 10, q1: "draft" } }, new Date("2027-01-10T00:00:00Z"));
  assert.equal(items[2].status, undefined);
  assert.equal(items[2].score, undefined);
  assert.equal(items[3].status, "draft");
});
