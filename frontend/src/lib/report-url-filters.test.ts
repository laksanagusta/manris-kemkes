import assert from "node:assert/strict";
import test from "node:test";
import { resolveReportUrlFilters } from "./report-url-filters.ts";

const defaults = { cycle: "2026-Q3", comparisonOverride: "", scope: { organizationId: "a", organizationGroupId: "", organizationIds: ["a"] } };
const organizations = [{ id: "a" }, { id: "b" }];
test("report links override the exact period and authorized scope", () => {
  const result = resolveReportUrlFilters("cycle=2026-Q2&compare_cycle=2025-Q2&org_id=b,a,b", "2026-Q4", organizations, defaults);
  assert.equal(result.error, null);
  assert.deepEqual(result.filters, { cycle: "2026-Q2", comparisonOverride: "2025-Q2", scope: { organizationId: "", organizationGroupId: "", organizationIds: ["b", "a"] } });
});
test("absent report URL filters preserve saved preferences", () => {
  assert.deepEqual(resolveReportUrlFilters("", "2026-Q4", organizations, defaults).filters, defaults);
  assert.equal(resolveReportUrlFilters("unrelated=1", "2026-Q4", organizations, defaults).hasFilters, false);
});
test("revoked, mixed-access and invalid report links fail without broadening scope", () => {
  for (const search of ["org_id=revoked", "org_id=a,revoked", "cycle=2026-Q9", "cycle=2027-Q1", "compare_cycle=2027-Q1", "cycle=", "org_id=,"]) {
    const result = resolveReportUrlFilters(search, "2026-Q4", organizations, defaults);
    assert.ok(result.error, search);
    assert.deepEqual(result.filters, defaults);
  }
});
test("an explicitly empty org filter selects the all-authorized scope", () => {
  const result = resolveReportUrlFilters("cycle=2026-Q2&org_id=", "2026-Q4", organizations, defaults);
  assert.equal(result.error, null);
  assert.deepEqual(result.filters.scope.organizationIds, []);
  assert.equal(result.filters.scope.organizationGroupId, "");
});
test("aliases are accepted and changing cycle resets the implicit comparison", () => {
  const result = resolveReportUrlFilters("cycle=2026-Q1&comparisonCycle=2025-Q1&organizationIds=b", "2026-Q4", organizations, { ...defaults, comparisonOverride: "2026-Q2" });
  assert.equal(result.filters.comparisonOverride, "2025-Q1");
  assert.equal(result.filters.scope.organizationId, "b");
  assert.equal(resolveReportUrlFilters("cycle=2026-Q1", "2026-Q4", organizations, { ...defaults, comparisonOverride: "2026-Q2" }).filters.comparisonOverride, "");
});
