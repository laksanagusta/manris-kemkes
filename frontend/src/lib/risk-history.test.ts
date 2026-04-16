import assert from "node:assert/strict";
import test from "node:test";

import type { Risk } from "../types/risk";

// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { buildApprovedRiskHistoryItem, buildVersionHistoryItem } from "./risk-history.ts";

test("buildVersionHistoryItem uses inherent semantics", () => {
  const item = buildVersionHistoryItem(
    {
      id: "v1",
      code: "R-001",
      title: "Risk A",
      status: "approved",
      isCurrent: false,
      versionGroupId: "vg-1",
      probability: 4,
      impact: 4,
      inherentScore: 16,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "v2",
      code: "R-001",
      title: "Risk A",
      status: "approved",
      isCurrent: true,
      versionGroupId: "vg-1",
      probability: 5,
      impact: 4,
      inherentScore: 20,
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  );

  assert.equal(item.previousLevel, "Tinggi");
  assert.equal(item.currentLevel, "Sangat Tinggi");
  assert.equal(item.trend, "up");
  assert.equal(item.changeReason, "Skor 16 dibanding current 20");
});

test("buildApprovedRiskHistoryItem uses current effective score and target baseline", () => {
  const risk: Risk = {
    id: "risk-010",
    riskCode: "R-010",
    code: "R-010",
    title: "Risk B",
    description: "Risk B desc",
    category: "operasional",
    unitId: "unit-x",
    cause: ["Cause"],
    riskSource: "internal",
    riskOwnerId: "owner-x",
    controllability: "C",
    impactDesc: ["Impact"],
    existingControl: "Control",
    controlOwnerId: "control-owner-x",
    controlEffectiveness: "efektif",
    orgName: "Direktorat X",
    status: "approved",
    probability: 4,
    impact: 4,
    weight: 1,
    nilai: 16,
    inherentScore: 16,
    targetScore: 6,
    riskPriority: 1,
    riskAppetite: "dalam_batas",
    treatmentOption: "mitigasi",
    mitigation: {
      action: "Mitigate",
      owner: "Owner",
      dueDate: "2026-12-31",
      frequency: "rutin",
    },
    targetProbability: 2,
    targetImpact: 3,
    targetWeight: 1,
    targetNilai: 6,
    nextReviewDate: "2026-12-31",
  };

  const item = buildApprovedRiskHistoryItem(risk);

  assert.equal(item.currentLevel, "Tinggi");
  assert.equal(item.previousLevel, "Rendah");
  assert.equal(item.trend, "up");
  assert.equal(item.changeReason, "Skor target: 6, skor current/final: 16");
});

test("buildVersionHistoryItem keeps non-finalized current snapshots on inherent semantics", () => {
  const item = buildVersionHistoryItem(
    {
      id: "v1",
      code: "R-002",
      title: "Risk Draft",
      status: "approved",
      isCurrent: false,
      versionGroupId: "vg-2",
      probability: 4,
      impact: 4,
      inherentScore: 16,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "v2",
      code: "R-002",
      title: "Risk Draft",
      status: "assessment_in_review",
      isCurrent: true,
      versionGroupId: "vg-2",
      probability: 5,
      impact: 4,
      inherentScore: 20,
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  );

  assert.equal(item.previousLevel, "Tinggi");
  assert.equal(item.currentLevel, "Sangat Tinggi");
  assert.equal(item.trend, "up");
  assert.equal(item.changeReason, "Skor 16 dibanding current 20");
});
