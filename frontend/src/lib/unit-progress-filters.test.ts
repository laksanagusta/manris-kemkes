import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultUnitProgressPeriod, unitProgressPeriods, type UnitProgressProfile } from "./unit-progress-filters.ts";

const profile: UnitProgressProfile = {
  id: "rule", label: "2026 · Semester", year: 2026, ruleId: "rule", frequency: "semester",
  periods: [
    { id: "second", label: "Semester II", ordinal: 2, opensOn: "2027-01-01", closesOn: "2027-01-31" },
    { id: "first", label: "Semester I", ordinal: 1, opensOn: "2026-07-01", closesOn: "2026-07-31" },
  ],
};
test("period choices follow profile rules and retain next-year windows", () => {
  assert.deepEqual(unitProgressPeriods(profile).map(({ value }) => value), ["first", "second"]);
  assert.equal(defaultUnitProgressPeriod(profile, "2027-01-31"), "second");
  assert.equal(defaultUnitProgressPeriod(profile, "2026-11-15"), "first");
  assert.equal(defaultUnitProgressPeriod(profile, "2026-01-01"), "first");
});
test("a rule without periods never fabricates quarterly choices", () => {
  const empty = { ...profile, periods: [] };
  assert.deepEqual(unitProgressPeriods(empty), []);
  assert.equal(defaultUnitProgressPeriod(empty, "2026-11-15"), "");
});
