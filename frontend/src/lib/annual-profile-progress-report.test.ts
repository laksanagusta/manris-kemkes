import assert from "node:assert/strict";
import test from "node:test";
import { buildAnnualProgressSeries } from "./annual-profile-progress-report.ts";

test("annual progress uses paired targets and compares Final scores to the selected baseline", () => {
  const [baseline, gap, latest] = buildAnnualProgressSeries({
    organizations: [],
    baseline: [
      { groupId: "a", score: 12, weight: 1.2, target: 6 },
      { groupId: "b", score: 9, weight: 1, target: null },
      { groupId: "c", score: 10, weight: 2, target: 7 },
    ],
    periods: [
      { id: "p1", label: "Periode 1", risks: [], totalRisks: 3, reportedTasks: 0, totalTasks: 0 },
      { id: "p2", label: "Periode 2", totalRisks: 5, reportedTasks: 2, totalTasks: 4, risks: [
        { groupId: "a", score: 8, weight: 1.2, target: 6 },
        { groupId: "b", score: 9.6, weight: 1, target: null },
        { groupId: "c", score: 10.1, weight: 2, target: 7 },
        { groupId: "d", score: 20, weight: null, target: null },
      ] },
    ],
  });
  assert.equal(baseline.label, "Baseline");
  assert.equal(baseline.up, null);
  assert.equal(gap.above, null);
  assert.equal(gap.mitigation, null);
  assert.equal(latest.scoreCount, 4);
  assert.equal(latest.weightCount, 3);
  assert.equal(latest.totalRisks, 5);
  assert.equal(latest.scoreWithTarget, 9.05);
  assert.equal(latest.target, 6.5);
  assert.equal(latest.mitigation, 50);
  assert.deepEqual([latest.above, latest.within], [3, 1]);
  assert.deepEqual([latest.up, latest.down, latest.stable, latest.compared], [1, 1, 1, 3]);
  assert.deepEqual([latest.rendah, latest.sedang, latest.sangat_tinggi], [1, 2, 1]);
});
