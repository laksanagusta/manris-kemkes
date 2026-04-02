import assert from "node:assert/strict";
import test from "node:test";

import {
  filterMeetingRiskOptions,
  normalizeMeetingMinuteDate,
} from "./meeting-minutes-utils";

test("normalizeMeetingMinuteDate keeps yyyy-mm-dd values", () => {
  assert.equal(normalizeMeetingMinuteDate("2026-04-02"), "2026-04-02");
});

test("normalizeMeetingMinuteDate trims ISO datetime to date", () => {
  assert.equal(normalizeMeetingMinuteDate("2026-04-02T09:30:00Z"), "2026-04-02");
});

test("normalizeMeetingMinuteDate falls back to today for invalid values", () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(normalizeMeetingMinuteDate("2 April 2026"), today);
  assert.equal(normalizeMeetingMinuteDate(""), today);
});

test("filterMeetingRiskOptions matches code and title locally", () => {
  const risks = [
    { id: "1", code: "R-001", title: "Distribusi vaksin", status: "approved" },
    { id: "2", code: "R-002", title: "Keterlambatan laporan", status: "draft" },
  ];

  assert.deepEqual(filterMeetingRiskOptions(risks, "vaksin").map((item) => item.id), ["1"]);
  assert.deepEqual(filterMeetingRiskOptions(risks, "r-002").map((item) => item.id), ["2"]);
  assert.equal(filterMeetingRiskOptions(risks, " ").length, 2);
});
