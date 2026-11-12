import assert from "node:assert/strict";
import { test } from "node:test";

import { groupUnitProgress } from "./unit-progress.ts";
import type { UnitProgressReport } from "../types/unit-progress.ts";

const base = { organizationId: "a", code: "R", title: "Risiko", updatedAt: "2026-10-02T00:00:00Z" };
const report: UnitProgressReport = {
  cycle: "2026-Q3",
  monitoringAvailable: false,
  organizations: [{ id: "a", name: "Unit A" }, { id: "b", name: "Unit B" }, { id: "empty", name: "Unit Kosong" }],
  risks: [
    { ...base, id: "new", status: "draft", profileChanged: false },
    { ...base, id: "started", status: "final", monitoringStatus: "draft", profileChanged: true },
    { ...base, id: "finished", status: "final", monitoringStatus: "final", profileChanged: false },
    { ...base, id: "missing", status: "final", profileChanged: false },
    { ...base, id: "before-window", organizationId: "b", status: "final", profileChanged: false },
  ],
  workingPapers: [],
  evaluations: [],
  mitigations: [
    { ...base, id: "valid", status: "reported", dueDate: "", owner: "", riskTitle: "", overdue: false, reportedLate: true },
    { ...base, id: "invalid", status: "incomplete", dueDate: "", owner: "", riskTitle: "", overdue: true, reportedLate: false },
    { ...base, id: "skipped", status: "skipped", dueDate: "", owner: "", riskTitle: "", overdue: false, reportedLate: false },
  ],
};

test("monitoring counts one row per Final risk and keeps zero-data units", () => {
  const [unit, waiting, empty] = groupUnitProgress(report);
  assert.equal(unit.riskDrafts, 1);
  assert.deepEqual(unit.monitoring, { total: 3, notStarted: 1, drafts: 1, final: 1 });
  assert.equal(unit.mitigationReported, 1);
  assert.equal(unit.mitigations.length, 3);
  assert.match(unit.attention[0], /^1 laporan mitigasi/);
  assert.deepEqual(waiting.attention, []);
  assert.equal(empty.monitoring.total, 0);
  assert.deepEqual(empty.attention, []);
  const [, open] = groupUnitProgress({ ...report, monitoringAvailable: true });
  assert.deepEqual(open.attention, ["1 pemantauan belum final"]);
});
