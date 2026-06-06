import assert from "node:assert/strict";
import test from "node:test";

const mitigationTableSearchLib = await import(
  new URL("./mitigation-table-search.ts", import.meta.url).href,
);

const { filterMitigationItems } = mitigationTableSearchLib as typeof import("./mitigation-table-search");

test("filterMitigationItems returns all items for blank query", () => {
  const items = [
    { action: "Koordinasi vendor", owner: "Tim Logistik", dueDate: "2026-06-01" },
    { action: "Audit proses", owner: "Inspektorat", dueDate: "2026-06-02" },
  ];

  const result = filterMitigationItems(items, "   ");

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((entry) => entry.index), [0, 1]);
});

test("filterMitigationItems matches action, owner, detail, and mitigation type", () => {
  const items = [
    {
      action: "Koordinasi vendor cadangan",
      owner: "Tim Logistik",
      dueDate: "2026-06-01",
      mitigationType: "reduce_probability" as const,
      activityStage: "Pelaksanaan",
    },
    {
      action: "Revisi SOP",
      owner: "Unit Kepatuhan",
      dueDate: "2026-06-02",
      mitigationType: "reduce_impact" as const,
      expectedOutput: "SOP baru disetujui",
    },
  ];

  assert.equal(filterMitigationItems(items, "logistik").length, 1);
  assert.equal(filterMitigationItems(items, "sop baru").length, 1);
  assert.equal(filterMitigationItems(items, "dampak").length, 1);
  assert.equal(filterMitigationItems(items, "pelaksanaan").length, 1);
});
