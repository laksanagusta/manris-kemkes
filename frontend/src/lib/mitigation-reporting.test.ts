import assert from "node:assert/strict";
import test from "node:test";

import { getMitigationSubmissionActionState, getMitigationTaskReportAction } from "./mitigation-reporting.mjs";

test("mitigation progress remains actionable after its due date", () => {
  assert.deepEqual(
    getMitigationSubmissionActionState(
      "2026-04-03",
      "2026-04-02",
      new Date("2026-04-05T08:00:00.000Z"),
    ),
    {
      allowed: true,
      message: "Terlambat, tetap bisa lapor progres",
      isOverdue: true,
    },
  );
});

test("mitigation progress opens from H+1 after the period ends", () => {
  assert.deepEqual(
    getMitigationSubmissionActionState(
      "2026-04-03",
      "2026-04-04",
      new Date("2026-04-02T08:00:00.000Z"),
    ),
    {
      allowed: false,
      message: "Laporan dapat dikirim mulai 4 Apr 2026 (H+1 setelah periode berakhir)",
      isOverdue: false,
    },
  );
});

test("reporting opens and becomes late at midnight Jakarta time", () => {
  const task = { status: "pending", periodEnd: "2026-03-31", dueDate: "2026-04-05" };
  assert.equal(getMitigationTaskReportAction(task, new Date("2026-03-31T16:59:59Z")).allowed, false);
  assert.equal(getMitigationTaskReportAction(task, new Date("2026-03-31T17:00:00Z")).label, "Isi laporan");
  assert.equal(getMitigationTaskReportAction(task, new Date("2026-04-05T16:59:59Z")).label, "Isi laporan");
  assert.equal(getMitigationTaskReportAction(task, new Date("2026-04-05T17:00:00Z")).label, "Lapor terlambat");
});

test("late reporting never offers write actions for a terminal task", () => {
  const task = { periodEnd: "2026-03-31", dueDate: "2026-04-05" };
  const now = new Date("2026-04-06T08:00:00Z");
  assert.equal(getMitigationTaskReportAction({ ...task, status: "done" }, now).label, "Lihat laporan");
  for (const status of ["done", "not_reported", "skipped"]) {
    assert.equal(getMitigationTaskReportAction({ ...task, status }, now).allowed, false);
  }
});
