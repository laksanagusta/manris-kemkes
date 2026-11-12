import assert from "node:assert/strict";
import test from "node:test";
import { createDisplayDateFormatter, formatDisplayDate } from "./display-date.ts";

test("single-digit calendar and clock values are padded in Jakarta", () => {
  const date = new Date("2026-01-07T01:05:03Z");
  const parts = createDisplayDateFormatter("id-ID", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  for (const [type, value] of Object.entries({ year: "2026", month: "01", day: "07", hour: "08", minute: "05", second: "03" })) {
    assert.equal(parts.find(part => part.type === type)?.value, value);
  }
});

test("date/time styles preserve month names and the requested time zone", () => {
  assert.match(formatDisplayDate(new Date("2026-01-06T17:05:00Z"), {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
  }), /^07 Jan 2026.*00[.:]05$/);
});

test("month-only headings stay month-only and date-only values do not acquire a clock", () => {
  const date = new Date("2026-11-17T12:00:00Z");
  assert.equal(formatDisplayDate(date, { month: "long", year: "numeric", timeZone: "UTC" }), "November 2026");
  assert.equal(formatDisplayDate(date, { dateStyle: "medium", timeZone: "UTC" }), "17 Nov 2026");
});
