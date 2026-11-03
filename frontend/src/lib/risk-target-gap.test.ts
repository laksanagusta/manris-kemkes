import assert from "node:assert/strict";
import test from "node:test";
import { buildRiskTargetGap } from "./risk-summary-widgets";
import type { QuarterlyReport, QuarterlyRisk } from "../types/quarterly-report";

const risk = (id: string, extra: Partial<QuarterlyRisk> = {}): QuarterlyRisk => ({
  id, title: id, organizationId: "unit", nilai: 90,
  targetProbability: 2, targetImpact: 2, targetWeight: 1.8, targetNilai: 7.2,
  monitoringStatus: "final", monitoringAssessmentCycle: "2026-Q3", monitoringObservedNilai: 7.2,
  ...extra,
});
const report = (risks: QuarterlyRisk[]): QuarterlyReport => ({
  cycle: "2026-Q3", comparisonCycle: "2026-Q2", generatedAt: "2026-10-05T00:00:00Z",
  warnings: [], organizations: [{ id: "unit", name: "Unit" }], risks, previousRisks: [], tasks: [], events: [],
});

test("compares Final observations with their own targets; keeps incomplete and wrong-cycle data unavailable", () => {
  const data = buildRiskTargetGap(report([
    risk("above", { monitoringObservedNilai: 10 }), risk("equal"),
    risk("below", { monitoringObservedNilai: 3 }),
    risk("draft", { monitoringStatus: "draft" }),
    risk("wrong-cycle", { monitoringAssessmentCycle: "2026-Q2" }),
    risk("missing-score", { monitoringObservedNilai: undefined }),
    risk("invalid-score", { monitoringObservedNilai: NaN }),
    risk("invalid-target", { targetProbability: 0 }),
    risk("missing-target", { targetWeight: undefined }),
  ]));
  assert.deepEqual(data.categories.map(row => row.count), [1, 1, 1, 6]);
  assert.equal(data.total, 9);
  assert.equal(data.comparable, 3);
});

test("calculates targets and compares to two decimals without using profile scores", () => {
  const data = buildRiskTargetGap(report([
    risk("calculated", { targetNilai: undefined, monitoringObservedNilai: 7.2 + Number.EPSILON }),
    risk("profile-only", { monitoringObservedNilai: undefined, nilai: 3 }),
  ]));
  assert.deepEqual(data.categories.map(row => row.count), [0, 1, 0, 1]);
});

test("keeps all-unavailable and empty populations distinct", () => {
  const unknown = buildRiskTargetGap(report([risk("unknown", { monitoringStatus: "draft" })]));
  assert.equal(unknown.comparable, 0);
  assert.equal(unknown.categories[3].count, 1);
  const empty = buildRiskTargetGap(report([]));
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.categories.map(row => row.count), [0, 0, 0, 0]);
});
