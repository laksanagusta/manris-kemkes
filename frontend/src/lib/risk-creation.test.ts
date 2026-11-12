import assert from "node:assert/strict";
import test from "node:test";

const { hasRiskScore, riskFinalizationCycle, riskPeriodLabel } = await import(new URL("./risk-creation.ts", import.meta.url).href);

test("initial finalization rolls across quarter and year boundaries in Jakarta", () => {
  assert.equal(riskFinalizationCycle("2027-Q1", true, new Date("2027-03-31T16:59:59Z")), "2027-Q1");
  assert.equal(riskFinalizationCycle("2027-Q1", true, new Date("2027-03-31T17:00:00Z")), "2027-Q2");
  assert.equal(riskFinalizationCycle("2027-Q4", true, new Date("2027-12-31T17:00:00Z")), "2028-Q1");
  assert.equal(riskFinalizationCycle("2027-Q1", false, new Date("2027-07-01T00:00:00Z")), "2027-Q1");
  assert.equal(riskPeriodLabel("2027-Q2"), "Triwulan II 2027");
});

test("unassessed and partial scores never count as a completed assessment", () => {
  for (const [probability, impact] of [[0, 0], [0, 3], [3, 0], [-1, 2], [6, 2]]) {
    assert.equal(hasRiskScore(probability, impact), false);
  }
  assert.equal(hasRiskScore(3, 3), true);
  assert.equal(hasRiskScore(1, 5), true);
});
