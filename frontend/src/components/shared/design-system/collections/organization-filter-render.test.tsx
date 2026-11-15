import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DynamicTableFilters } from "./dynamic-table-filters";
import type { TableFilterField } from "./dynamic-table-filter-state";

const fields: TableFilterField[] = [
  { id: "organization", label: "Organisasi", organizationScope: true, required: true, value: "child", options: [{ value: "child", label: "UPR-T2" }], onChange() {} },
  { id: "status", label: "Status", required: true, value: "draft", onChange() {} },
];

test("production toolbar hides the organization chip for a leaf while preserving other filters", () => {
  const html = renderToStaticMarkup(createElement(DynamicTableFilters, { fields, organizationFilterVisible: false }));
  assert.doesNotMatch(html, /Organisasi|UPR-T2/);
  assert.match(html, /Filter Status/);
});

test("production toolbar includes the organization chip for a parent", () => {
  const html = renderToStaticMarkup(createElement(DynamicTableFilters, { fields, organizationFilterVisible: true }));
  assert.match(html, /Filter Organisasi: UPR-T2/);
  assert.match(html, /Filter Status/);
});
