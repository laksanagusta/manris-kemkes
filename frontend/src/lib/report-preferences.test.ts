import assert from "node:assert/strict";
import test from "node:test";
import { parseReportPreferences } from "./report-preferences.ts";

const organizations = [{ id: "a" }, { id: "b" }];
const groups = [{ id: "g", members: [{ id: "a" }] }];
const saved = (ids: unknown[], group = "", cycle = "2026-Q3") => JSON.stringify({ cycle, comparisonOverride: "", scope: { organizationId: "a", organizationGroupId: group, organizationIds: ids } });

test("restoration removes revoked units and duplicate IDs", () => {
  assert.deepEqual(parseReportPreferences(saved(["a", "revoked", "a", 42]), "2026-Q4", organizations, groups)?.scope.organizationIds, ["a"]);
});
test("selected group membership constrains restored selections", () => {
  assert.deepEqual(parseReportPreferences(saved(["a", "b"], "g"), "2026-Q4", organizations, groups)?.scope.organizationIds, ["a"]);
});
test("fully revoked selections and removed groups fall back rather than selecting all units", () => {
  assert.equal(parseReportPreferences(saved(["revoked"]), "2026-Q4", organizations, groups), null);
  assert.equal(parseReportPreferences(saved(["a"], "removed"), "2026-Q4", organizations, groups), null);
});
test("malformed data and future periods are ignored", () => {
  for (const raw of [null, "not json", "null", "{}", saved(["a"], "", "2027-Q1")]) assert.equal(parseReportPreferences(raw, "2026-Q4", organizations, groups), null);
});
test("explicit empty group selections stay empty", () => {
  assert.deepEqual(parseReportPreferences(saved([], "g"), "2026-Q4", organizations, groups)?.scope.organizationIds, []);
});
