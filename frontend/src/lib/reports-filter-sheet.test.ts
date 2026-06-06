import assert from "node:assert/strict";
import test from "node:test";

import {
  copyReportsFilterScope,
  resolveDefaultReportsFilterScope,
  type ReportsFilterScope,
} from "./reports-filter-sheet.ts";

test("copyReportsFilterScope creates an isolated copy of unit ids", () => {
  const applied: ReportsFilterScope = {
    organizationId: "",
    organizationGroupId: "group-a",
    organizationIds: ["org-a", "org-b"],
  };

  const draft = copyReportsFilterScope(applied);
  draft.organizationIds.pop();

  assert.deepEqual(applied.organizationIds, ["org-a", "org-b"]);
  assert.deepEqual(draft.organizationIds, ["org-a"]);
});

test("resolveDefaultReportsFilterScope clears scope for global users", () => {
  assert.deepEqual(
    resolveDefaultReportsFilterScope(
      { isGlobal: true, organizationId: null },
      [{ id: "org-a" }],
    ),
    {
      organizationId: "",
      organizationGroupId: "",
      organizationIds: [],
    },
  );
});

test("resolveDefaultReportsFilterScope selects a valid default organization", () => {
  assert.deepEqual(
    resolveDefaultReportsFilterScope(
      { isGlobal: false, organizationId: "org-own" },
      [{ id: "org-own" }, { id: "org-child" }],
    ),
    {
      organizationId: "org-own",
      organizationGroupId: "",
      organizationIds: ["org-own"],
    },
  );
});

test("resolveDefaultReportsFilterScope clears an unavailable default organization", () => {
  assert.deepEqual(
    resolveDefaultReportsFilterScope(
      { isGlobal: false, organizationId: "org-missing" },
      [{ id: "org-own" }],
    ),
    {
      organizationId: "",
      organizationGroupId: "",
      organizationIds: [],
    },
  );
});
