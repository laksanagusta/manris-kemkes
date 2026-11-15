import test from "node:test";
import assert from "node:assert/strict";

const { createMonitoringRulePeriods, validateMonitoringRuleInput } = await import(new URL("./monitoring-rule-form.ts", import.meta.url).href);

test("generates all labeled periods with calendar dates and ordinal one", () => {
  const monthly = createMonitoringRulePeriods(2028, "monthly");
  assert.equal(monthly.length, 12);
  assert.deepEqual(monthly[1], { label: "Februari", ordinal: 2, opensOn: "2028-02-01", closesOn: "2028-02-29" });
  assert.deepEqual(createMonitoringRulePeriods(2026, "quarterly")[3], { label: "Kuartal IV", ordinal: 4, opensOn: "2026-10-01", closesOn: "2026-12-31" });
  assert.equal(createMonitoringRulePeriods(2026, "semester").length, 2);
});

function validRule() {
  return { name: "Pemantauan reguler", year: 2026, frequency: "semester" as const, active: true, periods: createMonitoringRulePeriods(2026, "semester") };
}

test("accepts inclusive nonoverlapping windows in the next year", () => {
  const input = validRule();
  input.periods[1].opensOn = "2027-01-01";
  input.periods[1].closesOn = "2027-01-31";
  assert.equal(validateMonitoringRuleInput(input), null);
});

test("rejects inclusive overlap and reversed windows", () => {
  const input = validRule();
  input.periods[1].opensOn = input.periods[0].closesOn;
  assert.match(validateMonitoringRuleInput(input) ?? "", /tumpang tindih/);
  input.periods[1].opensOn = "2026-12-31";
  input.periods[1].closesOn = "2026-12-01";
  assert.match(validateMonitoringRuleInput(input) ?? "", /sebelum/);
});

test("rejects impossible dates, missing periods, and unexpected order", () => {
  const input = validRule();
  input.periods[0].closesOn = "2026-02-30";
  assert.match(validateMonitoringRuleInput(input) ?? "", /tanggal/);
  input.periods = createMonitoringRulePeriods(2026, "semester").slice(0, 1);
  assert.match(validateMonitoringRuleInput(input) ?? "", /2 periode/);
  input.periods = createMonitoringRulePeriods(2026, "semester");
  input.periods[1].ordinal = 1;
  assert.match(validateMonitoringRuleInput(input) ?? "", /urutan/);
});

test("requires a name and whole profile year", () => {
  assert.match(validateMonitoringRuleInput({ ...validRule(), name: "  " }) ?? "", /Nama/);
  assert.match(validateMonitoringRuleInput({ ...validRule(), year: 2026.5 }) ?? "", /Tahun/);
});

test("rejects windows outside the profile year and following year", () => {
  const input = validRule();
  input.periods[0].opensOn = "2025-12-31";
  assert.match(validateMonitoringRuleInput(input) ?? "", /tahun profil/);
  input.periods = createMonitoringRulePeriods(2026, "semester");
  input.periods[1].closesOn = "2028-01-01";
  assert.match(validateMonitoringRuleInput(input) ?? "", /tahun profil/);
});
