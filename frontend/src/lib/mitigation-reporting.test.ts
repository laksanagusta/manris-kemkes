import assert from "node:assert/strict";
import test from "node:test";

import { getMitigationSubmissionActionState } from "./mitigation-reporting.mjs";

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
