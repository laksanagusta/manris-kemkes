import assert from "node:assert/strict";
import test from "node:test";

import type { Risk, RiskLevel } from "../types/risk";

const riskLib = await import(new URL("./risk.ts", import.meta.url).href);

type RiskScoreSnapshot = {
  probability: number;
  impact: number;
  weight: number;
  nilai: number;
  score: number;
  level: RiskLevel;
  matrix: {
    probability: number;
    impact: number;
    cellKey: string;
    probabilityLabel: string;
    impactLabel: string;
  };
};

type RiskScoreSemantics = {
  source: "inherent" | "reviewed";
  usesReviewed: boolean;
  isFinalized: boolean;
  effective: RiskScoreSnapshot;
  primary: RiskScoreSnapshot;
  inherent: RiskScoreSnapshot;
};

type RiskScoreResolver = (risk: Risk) => RiskScoreSemantics;

function getResolver(): RiskScoreResolver {
  const resolver = (riskLib as { resolveRiskScoreSemantics?: unknown }).resolveRiskScoreSemantics;

  assert.equal(typeof resolver, "function", "Expected risk.ts to export resolveRiskScoreSemantics");

  return resolver as RiskScoreResolver;
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "risk-1",
    riskCode: "R-001",
    code: "R-001",
    title: "Primary score semantics test",
    description: "Test risk",
    category: "operasional",
    unitId: "unit-1",
    cause: ["Process gap"],
    riskSource: "internal",
    riskOwnerId: "owner-1",
    controllability: "C",
    impactDesc: ["Service disruption"],
    existingControl: "Weekly review",
    controlOwnerId: "control-owner-1",
    controlEffectiveness: "efektif",
    probability: 4,
    impact: 5,
    weight: 1.2,
    nilai: 24,
    inherentScore: 24,
    riskPriority: 1,
    riskAppetite: "di_atas_batas",
    treatmentOption: "mitigasi",
    mitigation: {
      action: "Mitigate",
      owner: "Owner",
      dueDate: "2026-12-31",
      frequency: "rutin",
    },
    targetProbability: 2,
    targetImpact: 3,
    targetWeight: 1.43,
    targetNilai: 8.58,
    targetScore: 9,
    nextReviewDate: "2026-12-31",
    status: "draft",
    ...overrides,
  };
}

test("resolveRiskScoreSemantics uses the complete reviewed bundle for approved risks", () => {
  const risk = makeRisk({
    status: "approved",
    reviewedProbability: 1,
    reviewedImpact: 2,
    reviewedWeight: 1.5,
    reviewedNilai: 3,
    reviewedScore: 3,
  });

  const resolved = getResolver()(risk);

  assert.equal(resolved.source, "reviewed");
  assert.equal(resolved.usesReviewed, true);
  assert.equal(resolved.isFinalized, true);
  assert.deepEqual(resolved.primary, resolved.effective);
  assert.equal(resolved.effective.probability, 1);
  assert.equal(resolved.effective.impact, 2);
  assert.equal(resolved.effective.weight, 1.5);
  assert.equal(resolved.effective.nilai, 3);
  assert.equal(resolved.effective.score, 3);
  assert.equal(resolved.effective.level, "sangat_rendah");
  assert.deepEqual(resolved.effective.matrix, {
    probability: 1,
    impact: 2,
    cellKey: "1-2",
    probabilityLabel: "Sangat Jarang",
    impactLabel: "Ringan",
  });
  assert.equal(resolved.inherent.score, 24);
  assert.equal(resolved.inherent.level, "sangat_tinggi");
});

test("resolveRiskScoreSemantics falls back fully to the inherent bundle when approved reviewed data is partial", () => {
  const risk = makeRisk({
    status: "approved",
    reviewedProbability: 1,
    reviewedImpact: 1,
    reviewedWeight: 1,
    reviewedNilai: 1,
  });

  const resolved = getResolver()(risk);

  assert.equal(resolved.source, "inherent");
  assert.equal(resolved.usesReviewed, false);
  assert.equal(resolved.effective.probability, 4);
  assert.equal(resolved.effective.impact, 5);
  assert.equal(resolved.effective.weight, 1.2);
  assert.equal(resolved.effective.nilai, 24);
  assert.equal(resolved.effective.score, 24);
  assert.equal(resolved.effective.level, "sangat_tinggi");
  assert.deepEqual(resolved.effective.matrix, {
    probability: 4,
    impact: 5,
    cellKey: "4-5",
    probabilityLabel: "Sering",
    impactLabel: "Sangat Berat",
  });
  assert.deepEqual(resolved.effective, resolved.inherent);
});

test("resolveRiskScoreSemantics ignores reviewed values when the risk is not approved", () => {
  const risk = makeRisk({
    status: "in_approval",
    reviewedProbability: 1,
    reviewedImpact: 1,
    reviewedWeight: 1,
    reviewedNilai: 1,
    reviewedScore: 1,
  });

  const resolved = getResolver()(risk);

  assert.equal(resolved.source, "inherent");
  assert.equal(resolved.usesReviewed, false);
  assert.equal(resolved.isFinalized, false);
  assert.deepEqual(resolved.primary, resolved.inherent);
  assert.equal(resolved.effective.score, 24);
  assert.equal(resolved.effective.level, "sangat_tinggi");
});

test("resolveRiskScoreSemantics derives matrix and level from the effective bundle", () => {
  const risk = makeRisk({
    status: "approved",
    reviewedProbability: 2,
    reviewedImpact: 2,
    reviewedWeight: 1.8,
    reviewedNilai: 7.2,
    reviewedScore: 7,
  });

  const resolved = getResolver()(risk);

  assert.equal(resolved.effective.level, "rendah");
  assert.equal(resolved.inherent.level, "sangat_tinggi");
  assert.deepEqual(resolved.effective.matrix, {
    probability: 2,
    impact: 2,
    cellKey: "2-2",
    probabilityLabel: "Jarang",
    impactLabel: "Ringan",
  });
});

test("resolveRiskScoreSemantics keeps zero-like reviewed values when the approved bundle is complete", () => {
  const risk = makeRisk({
    status: "approved",
    reviewedProbability: 1,
    reviewedImpact: 1,
    reviewedWeight: 0,
    reviewedNilai: 0,
    reviewedScore: 0,
  });

  const resolved = getResolver()(risk);

  assert.equal(resolved.source, "reviewed");
  assert.equal(resolved.usesReviewed, true);
  assert.equal(resolved.effective.weight, 0);
  assert.equal(resolved.effective.nilai, 0);
  assert.equal(resolved.effective.score, 0);
  assert.equal(resolved.effective.level, "sangat_rendah");
});
