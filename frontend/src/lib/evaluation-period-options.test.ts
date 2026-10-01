import assert from "node:assert/strict";
import test from "node:test";

import { getEvaluationPeriodFilterOptions } from "./evaluation-period-options.ts";

test("period filter options include all persisted periods in natural order", () => {
  assert.deepEqual(
    getEvaluationPeriodFilterOptions(
      ["all", " 2025-Q4 ", "2026-H1", "2025-Q4", ""],
      [
        { value: "all", label: "Semua Periode" },
        { value: "2026-Q2", label: "2026-Q2" },
        { value: "2026-Q3", label: "2026-Q3" },
        { value: "2026-Q4", label: "2026-Q4" },
      ],
    ),
    [
      { value: "all", label: "Semua periode" },
      { value: "2025-Q4", label: "2025-Q4" },
      { value: "2026-H1", label: "2026-H1" },
      { value: "2026-Q2", label: "2026-Q2" },
      { value: "2026-Q3", label: "2026-Q3" },
      { value: "2026-Q4", label: "2026-Q4" },
    ],
  );
});
