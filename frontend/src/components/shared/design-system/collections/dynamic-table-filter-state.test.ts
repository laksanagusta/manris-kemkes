import test from "node:test";
import assert from "node:assert/strict";
import { canApplyFilter, filterDefault, isFilterActive, type TableFilterField } from "./dynamic-table-filter-state.ts";

const field = (overrides: Partial<TableFilterField> = {}): TableFilterField => ({ id: "status", label: "Status", value: "all", onChange: () => {}, ...overrides });

test("each editor restores its real baseline instead of imposing all on dates and text", () => {
  assert.equal(filterDefault(field()), "all");
  assert.equal(filterDefault(field({ type: "date" })), "");
  assert.equal(filterDefault(field({ type: "text" })), "");
  assert.equal(filterDefault(field({ defaultValue: "active" })), "active");
  assert.equal(filterDefault(field({ defaultValue: "" })), "");
});

test("URL-selected filters remain active even when their option is no longer loaded", () => {
  assert.equal(isFilterActive(field({ value: "final", options: [] })), true);
  assert.equal(isFilterActive(field({ value: "active", defaultValue: "active" })), false);
});

test("select drafts must be real choices and text drafts must be nonempty", () => {
  const choice = field({ options: [{ value: "final", label: "Final" }] });
  assert.equal(canApplyFilter(choice, "final"), true);
  assert.equal(canApplyFilter(choice, "invented"), false);
  assert.equal(canApplyFilter(field({ type: "text" }), "  "), false);
  assert.equal(canApplyFilter(field({ type: "text" }), " risiko "), true);
});

test("dates reject overflow days and accept real leap days", () => {
  const date = field({ type: "date" });
  for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-2-1", ""]) assert.equal(canApplyFilter(date, value), false, value);
  for (const value of ["2028-02-29", "2026-11-01"]) assert.equal(canApplyFilter(date, value), true, value);
});
