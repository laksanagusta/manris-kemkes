import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPerformanceRiskEmptyState,
  sortPerformanceRiskNodes,
  statusLabelForPerformanceRisk,
} from "./performance-risk.ts";
import type { PerformanceRiskNode } from "../types/performance-risk.ts";

function heatmap() {
  return Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
}

function node(overrides: Partial<PerformanceRiskNode>): PerformanceRiskNode {
  return {
    roId: "ro-default",
    roTitle: "RO Default",
    kegiatanTitle: "",
    programTitle: "",
    ikuTitle: "",
    sasaranTitle: "",
    tujuanTitle: "",
    period: "2026-H1",
    riskCount: 0,
    highestInherentScore: 0,
    highestLevel: "",
    totalExposure: 0,
    avgExposure: 0,
    highExtremeCount: 0,
    heatmap: heatmap(),
    mitigationTotal: 0,
    mitigationPending: 0,
    mitigationOverdue: 0,
    attentionStatus: "no_risk",
    ...overrides,
  };
}

test("sortPerformanceRiskNodes sorts by exposure, high/extreme count, overdue, title", () => {
  const sorted = sortPerformanceRiskNodes([
    node({ roId: "a", roTitle: "A", totalExposure: 10, highExtremeCount: 0, mitigationOverdue: 0 }),
    node({ roId: "b", roTitle: "B", totalExposure: 20, highExtremeCount: 1, mitigationOverdue: 0 }),
    node({ roId: "c", roTitle: "C", totalExposure: 20, highExtremeCount: 0, mitigationOverdue: 5 }),
  ]);

  assert.deepEqual(sorted.map((item) => item.roId), ["b", "c", "a"]);
});

test("statusLabelForPerformanceRisk maps attention statuses", () => {
  assert.equal(statusLabelForPerformanceRisk("critical"), "Kritis");
  assert.equal(statusLabelForPerformanceRisk("watch"), "Perlu Pantauan");
  assert.equal(statusLabelForPerformanceRisk("stable"), "Stabil");
  assert.equal(statusLabelForPerformanceRisk("no_risk"), "Belum Ada Risiko");
});

test("classifyPerformanceRiskEmptyState separates no planning and no linked risk", () => {
  assert.equal(
    classifyPerformanceRiskEmptyState({ totalRO: 0, linkedRO: 0, unlinkedRisks: 0 }),
    "no_planning",
  );
  assert.equal(
    classifyPerformanceRiskEmptyState({ totalRO: 2, linkedRO: 0, unlinkedRisks: 0 }),
    "no_linked_risk",
  );
  assert.equal(
    classifyPerformanceRiskEmptyState({ totalRO: 2, linkedRO: 1, unlinkedRisks: 1 }),
    "has_unlinked_risk",
  );
  assert.equal(
    classifyPerformanceRiskEmptyState({ totalRO: 2, linkedRO: 2, unlinkedRisks: 0 }),
    "ready",
  );
});

test("classifyPerformanceRiskEmptyState treats unlinked-only data as no linked risk", () => {
  assert.equal(
    classifyPerformanceRiskEmptyState({ totalRO: 3, linkedRO: 0, unlinkedRisks: 2 }),
    "no_linked_risk",
  );
});
