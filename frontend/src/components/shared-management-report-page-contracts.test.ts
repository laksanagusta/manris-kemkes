import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pages = {
  charters: readSource("../app/(app)/management/charters/page.tsx"),
  cascading: readSource("../app/(app)/risk/cascading/page.tsx"),
  planning: readSource("../app/(app)/management/planning/page.tsx"),
  reports: readSource("../app/(app)/reports/page.tsx"),
  complianceMonitoring: readSource(
    "../app/(app)/reports/compliance-monitoring/page.tsx",
  ),
};
const collectionLayoutExample = readSource(
  "./shared/design-system/examples/collection-layout-example.tsx",
);
const designSystemDocument = readSource("../../../DESIGN.md");
const designSystemPage = readSource("../app/(app)/design-system/page.tsx");
const planningSharedPage = readSource("./shared/planning-management-page.tsx");
const designSystemBarrel = readSource("./shared/design-system/index.ts");

const compositionSource = (name: string, source: string) =>
  name === "planning" ? planningSharedPage : source;

test("layout, action, and report components are exported by the production API", () => {
  for (const name of [
    "AccentButton",
    "ActionButton",
    "ActionIconButton",
    "DashboardKpiCard",
    "MetricGrid",
    "PageStack",
    "StandardCard",
    "ReportGrid",
    "ReportPanel",
    "ReportEmptyState",
    "ReportDrilldownSummary",
    "ReportLinkGrid",
  ]) {
    assert.match(designSystemBarrel, new RegExp(`export \\{[^}]*${name}`));
  }
});

test("all audited management and report routes use PageStack", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.match(
      compositionSource(name, source),
      /<PageStack[\s>]/,
      `${name} must render PageStack`,
    );
  }
});

test("all audited routes compose their page controls with CollectionToolbar", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.match(
      compositionSource(name, source),
      /<CollectionToolbar[\s>]/,
      `${name} must render CollectionToolbar`,
    );
  }
});

test("cascading uses the shared four-up metric grid", () => {
  assert.match(pages.cascading, /<MetricGrid[\s>]/);
  assert.doesNotMatch(pages.cascading, /grid gap-3 md:grid-cols-4/);
});

test("planning uses collection table primitives instead of a handcrafted table shell", () => {
  assert.match(planningSharedPage, /<CollectionTableCard[\s>]/);
  assert.match(planningSharedPage, /<CollectionTableHeader[\s>]/);
  assert.match(planningSharedPage, /<CollectionTableHead[\s>]/);
  assert.doesNotMatch(
    planningSharedPage,
    /shadow-\[0_1px_2px_rgba\(0,0,0,0\.04\),0_8px_24px/,
  );
});

test("reports uses shared design-system action buttons without local accent tokens", () => {
  assert.match(pages.reports, /<ActionButton[\s>]/);
  assert.match(pages.reports, /<AccentButton[\s>]/);
  assert.doesNotMatch(pages.reports, /--primary/);
});

test("the design system documents the actions-only report toolbar composition", () => {
  assert.match(collectionLayoutExample, /actions-only toolbar/i);
  assert.match(designSystemDocument, /Report dashboards use `CollectionToolbar`/);
});

test("page files do not define local React components", () => {
  assert.doesNotMatch(pages.cascading, /function RiskCascadeRowActions\(/);
  assert.match(
    pages.cascading,
    /from "@\/components\/shared\/risk-cascade-row-actions"/,
  );

  for (const componentName of [
    "PlanningHierarchyLoadingState",
    "PlanningHierarchyTable",
    "PlanningHierarchyRows",
  ]) {
    assert.doesNotMatch(
      pages.planning,
      new RegExp(`function ${componentName}\\(`),
    );
  }
  assert.match(
    pages.planning,
    /from "@\/components\/shared\/planning-management-page"/,
  );
});

test("report pages consume shared report shells instead of raw Card composition", () => {
  for (const name of ["reports", "complianceMonitoring"] as const) {
    assert.doesNotMatch(pages[name], /from "@\/components\/ui\/card"/);
  }
  assert.match(pages.reports, /<ReportPanel[\s>]/);
  assert.match(pages.reports, /<ReportLinkGrid[\s>]/);
  assert.match(pages.complianceMonitoring, /<ReportEmptyState[\s>]/);
  assert.match(pages.complianceMonitoring, /<ReportGrid[\s>]/);
  assert.match(designSystemPage, /<ReportPrimitivesExample\s*\/>/);
  assert.match(designSystemDocument, /\*\*ReportPanel\*\*/);
});

test("collection filter and notice layouts use shared primitives", () => {
  assert.match(pages.charters, /<CollectionFilterGrid[\s>]/);
  assert.match(pages.cascading, /<CollectionFilterGrid[\s>]/);
  assert.match(pages.cascading, /<CollectionNotice[\s>]/);
  assert.match(pages.cascading, /<CollectionErrorState[\s>]/);
});

test("audited routes consume shared components only through the design-system API", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.doesNotMatch(
      source,
      /from "@\/components\/shared\/(?!design-system)/,
      `${name} must not bypass the design-system API`,
    );
  }

  assert.match(
    pages.planning,
    /from "@\/components\/shared\/design-system"/,
  );
});

test("audited routes do not bypass design system with direct UI foundation imports", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.doesNotMatch(
      source,
      /from "@\/components\/ui\//,
      `${name} must consume UI foundations from the design-system API`,
    );
  }
});

test("cascading and reports use the design-system DashboardKpiCard", () => {
  for (const name of ["cascading", "reports"] as const) {
    assert.match(pages[name], /<DashboardKpiCard[\s>]/);
    assert.doesNotMatch(pages[name], /<KpiCard[\s>]/);
    assert.doesNotMatch(pages[name], /from "@\/components\/ui\/kpi-card"/);
  }
});
