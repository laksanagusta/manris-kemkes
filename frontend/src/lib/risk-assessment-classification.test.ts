import assert from "node:assert/strict";
import test from "node:test";

const riskLib = await import(new URL("./risk.ts", import.meta.url).href);

const { resolveRiskAssessmentClassification } = riskLib;

test("resolveRiskAssessmentClassification matches registration score rules", () => {
  const classification = resolveRiskAssessmentClassification(12);

  assert.equal(classification.level, "sedang");
  assert.equal(classification.priority, 3);
  assert.equal(classification.appetite, "di_atas_batas");
  assert.equal(classification.isRiskUtama, true);
});
