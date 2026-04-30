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
  source: "inherent";
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
    status: "assessment_draft",
    ...overrides,
  };
}

test("resolveRiskScoreSemantics always uses inherent values", () => {
  const risk = makeRisk({
    status: "approved",
    probability: 1,
    impact: 2,
    weight: 1.5,
    nilai: 3,
    inherentScore: 3,
  });

  const resolved = getResolver()(risk);

  assert.equal(resolved.source, "inherent");
  assert.equal(resolved.usesReviewed, false);
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
    probabilityLabel: "Jarang",
    impactLabel: "Kecil",
  });
  assert.deepEqual(resolved.effective, resolved.inherent);
});

test("KMK probability labels use official wording", () => {
  const { PROBABILITY_LABELS } = riskLib as {
    PROBABILITY_LABELS: Record<number, string>;
  };

  assert.equal(PROBABILITY_LABELS[1], "Jarang");
  assert.equal(PROBABILITY_LABELS[2], "Kemungkinan Kecil");
  assert.equal(PROBABILITY_LABELS[3], "Kemungkinan Sedang");
  assert.equal(PROBABILITY_LABELS[4], "Kemungkinan Besar");
  assert.equal(PROBABILITY_LABELS[5], "Hampir Pasti Terjadi");
});

test("KMK impact labels use official wording", () => {
  const { IMPACT_LABELS } = riskLib as {
    IMPACT_LABELS: Record<number, string>;
  };

  assert.equal(IMPACT_LABELS[1], "Tidak Signifikan");
  assert.equal(IMPACT_LABELS[5], "Katastropik");
});

test("highest display label stays KMK-compatible", () => {
  const { getRiskLevelDisplayLabel } = riskLib as {
    getRiskLevelDisplayLabel: (level: RiskLevel) => string;
  };

  assert.equal(getRiskLevelDisplayLabel("sangat_tinggi"), "Sangat Tinggi");
});
