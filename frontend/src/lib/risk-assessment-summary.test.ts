import assert from "node:assert/strict";
import test from "node:test";

const riskAssessmentSummaryLib = await import(
  new URL("./risk-assessment-summary.ts", import.meta.url).href,
);

const { resolveAssessmentScoreComparison } = riskAssessmentSummaryLib;

test("resolveAssessmentScoreComparison compares rounded inherent scores, not decimal nilai", () => {
  const comparison = resolveAssessmentScoreComparison({
    currentInherentScore: 7,
    currentNilai: 6.98,
    newNilai: 7.2,
  });

  assert.equal(comparison.currentScore, 7);
  assert.equal(comparison.newScore, 7);
  assert.equal(comparison.delta, 0);
  assert.equal(comparison.deltaPercent, 0);
  assert.equal(comparison.isStable, true);
  assert.equal(comparison.isDecrease, false);
});

test("resolveAssessmentScoreComparison falls back to rounded current nilai only when inherent score is absent", () => {
  const comparison = resolveAssessmentScoreComparison({
    currentNilai: 6.6,
    newNilai: 8.4,
  });

  assert.equal(comparison.currentScore, 7);
  assert.equal(comparison.newScore, 8);
  assert.equal(comparison.delta, 1);
  assert.equal(comparison.deltaPercent, 14);
});
