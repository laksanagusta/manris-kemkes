import assert from "node:assert/strict";
import test from "node:test";

import type { Risk } from "../types/risk";

// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { buildApprovedRiskHistoryItem, buildVersionHistoryItem } from "./risk-history.ts";

test("buildVersionHistoryItem uses the complete reviewed bundle for current history snapshots", () => {
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
      reviewedProbability: 2,
      reviewedImpact: 2,
      reviewedWeight: 1.8,
      reviewedNilai: 7.2,
      reviewedScore: 7,
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
      reviewedProbability: 1,
      reviewedImpact: 1,
      reviewedWeight: 0,
      reviewedNilai: 0,
      reviewedScore: 0,
    },
  );

  assert.equal(item.previousLevel, "Rendah");
  assert.equal(item.currentLevel, "Sangat Rendah");
  assert.equal(item.trend, "down");
  assert.equal(item.changeReason, "Skor 7 dibanding current 0");
});

test("buildVersionHistoryItem falls back to inherent semantics when the reviewed bundle is incomplete", () => {
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
      reviewedProbability: 2,
      reviewedImpact: 2,
      reviewedWeight: 1.8,
      reviewedNilai: 7.2,
      reviewedScore: null,
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
      reviewedProbability: 1,
      reviewedImpact: 1,
      reviewedWeight: 0,
      reviewedNilai: 0,
      reviewedScore: null,
    },
  );

  assert.equal(item.previousLevel, "Tinggi");
  assert.equal(item.currentLevel, "Sangat Tinggi");
  assert.equal(item.trend, "up");
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
    reviewedProbability: 1,
    reviewedImpact: 1,
    reviewedWeight: 0,
    reviewedNilai: 0,
    reviewedScore: 0,
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

  assert.equal(item.currentLevel, "Sangat Rendah");
  assert.equal(item.previousLevel, "Rendah");
  assert.equal(item.trend, "down");
  assert.equal(item.changeReason, "Skor target: 6, skor current/final: 0");
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
      reviewedProbability: 4,
      reviewedImpact: 4,
      reviewedWeight: 1,
      reviewedNilai: 16,
      reviewedScore: 16,
    },
    {
      id: "v2",
      code: "R-002",
      title: "Risk Draft",
      status: "in_approval",
      isCurrent: true,
      versionGroupId: "vg-2",
      probability: 5,
      impact: 4,
      inherentScore: 20,
      createdAt: "2026-02-01T00:00:00.000Z",
      reviewedProbability: 1,
      reviewedImpact: 1,
      reviewedWeight: 0,
      reviewedNilai: 0,
      reviewedScore: 0,
    },
  );

  assert.equal(item.previousLevel, "Tinggi");
  assert.equal(item.currentLevel, "Sangat Tinggi");
  assert.equal(item.trend, "up");
  assert.equal(item.changeReason, "Skor 16 dibanding current 20");
});
