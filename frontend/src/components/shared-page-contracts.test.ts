import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pages = {
  overview: readSource("../app/(app)/overview/page.tsx"),
  riskRegister: readSource("../app/(app)/risk/register/page.tsx"),
  workingPapers: readSource("../app/(app)/risk/working-papers/page.tsx"),
  inbox: readSource("../app/(app)/inbox/page.tsx"),
  mitigation: readSource("../app/(app)/compliance/penanganan/page.tsx"),
  monitoring: readSource("../app/(app)/compliance/monitoring/page.tsx"),
  evaluations: readSource("../app/(app)/evaluations/page.tsx"),
};

const designSystemPage = readSource("../app/(app)/design-system/page.tsx");
const designSystemDocument = readSource("../../../DESIGN.md");
const expandableSearchField = readSource(
  "../components/shared/design-system/collections/expandable-search-field.tsx",
);
const mitigationPanel = readSource(
  "../app/(app)/compliance/_components/mitigation-monitoring-panel.tsx",
);
const dialogExample = readSource(
  "../components/shared/design-system/examples/dialog-example.tsx",
);
const mitigationProgressDialogExample = readSource(
  "../components/shared/design-system/examples/mitigation-progress-dialog-example.tsx",
);
const mitigationProgressFormExample = readSource(
  "../components/shared/design-system/examples/mitigation-progress-form-example.tsx",
);

test("all audited routes use the shared PageStack layout primitive", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.match(source, /<PageStack[\s>]/, `${name} must render PageStack`);
  }
});

test("dashboard-like summaries use the shared MetricGrid", () => {
  for (const name of ["overview", "inbox", "evaluations"] as const) {
    assert.match(pages[name], /<MetricGrid[\s>]/, `${name} must render MetricGrid`);
  }
});

test("collection routes use the shared CollectionToolbar", () => {
  for (const name of [
    "riskRegister",
    "workingPapers",
    "inbox",
    "evaluations",
  ] as const) {
    assert.match(
      pages[name],
      /<CollectionToolbar[\s>]/,
      `${name} must render CollectionToolbar`,
    );
  }
});

test("mitigation monitoring uses the shared expandable search and compact status badge", () => {
  assert.match(expandableSearchField, /absolute right-2 size-4/);
  assert.match(mitigationPanel, /<ExpandableSearchField[\s>]/);
  assert.match(mitigationPanel, /<Badge\s+size="compact"\s+tone=/);
  assert.doesNotMatch(mitigationPanel, /bg-muted\/60 px-2 py-1 font-mono/);
  assert.doesNotMatch(mitigationPanel, /Daftar mitigasi/);
  assert.doesNotMatch(
    mitigationPanel,
    /Tinjau rencana penanganan yang mendekati tenggat/,
  );
  assert.doesNotMatch(
    mitigationPanel,
    /<span className="text-sm text-success">Selesai<\/span>/,
  );
  assert.match(
    mitigationPanel,
    /from "@\/components\/shared\/design-system"/,
  );
});

test("working papers consumes the shared create dialog instead of a local duplicate", () => {
  assert.match(
    pages.workingPapers,
    /from "@\/components\/shared\/working-paper-create-dialog"/,
  );
  assert.doesNotMatch(
    pages.workingPapers,
    /function WorkingPaperCreateDialog\(/,
  );
});

test("evaluations renders its filter toolbar once and keeps it outside the table card", () => {
  const usages = pages.evaluations.match(/<EvaluationFiltersToolbar/g) ?? [];
  assert.equal(usages.length, 1);
  assert.match(
    pages.evaluations,
    /<CollectionToolbar[\s\S]*?<EvaluationFiltersToolbar[\s\S]*?<CollectionTableCard>/,
  );
});

test("the design-system catalogue documents shared page and collection layout primitives", () => {
  assert.match(designSystemPage, /<CollectionLayoutExample\s*\/>/);
  assert.match(designSystemPage, /<MitigationProgressDialogExample\s*\/>/);
  assert.match(designSystemPage, /<MitigationProgressFormExample\s*\/>/);
  assert.match(designSystemDocument, /\*\*PageStack\*\*/);
  assert.match(designSystemDocument, /\*\*MetricGrid\*\*/);
  assert.match(designSystemDocument, /\*\*CollectionToolbar\*\*/);
  assert.match(designSystemDocument, /ExpandableSearchField/);
  assert.match(designSystemDocument, /[Cc]ompact status badges/);
  assert.match(designSystemDocument, /MitigationProgressForm/);
  assert.match(designSystemDocument, /MitigationProgressDialog/);
});

test("the design system documents its canonical component ownership", () => {
  assert.match(designSystemDocument, /@\/components\/shared\/design-system/);
  assert.match(designSystemDocument, /examples.*fixture/i);
  assert.match(designSystemDocument, /must not deep-import/i);
  assert.match(designSystemDocument, /collection-primitives\.tsx.*removed/i);
});

test("dialog examples keep the header border removed", () => {
  assert.doesNotMatch(dialogExample, /border-b border-border\/60/);
});

test("mitigation examples are built from shared dialog and form components", () => {
  assert.match(
    mitigationProgressDialogExample,
    /from "@\/components\/shared\/design-system"/,
  );
  assert.match(
    mitigationProgressFormExample,
    /from "@\/components\/shared\/design-system"/,
  );
  assert.match(mitigationProgressFormExample, /MitigationProgressForm/);
  assert.match(
    readSource("../components/shared/design-system/domain/mitigation-progress-form-shell.tsx"),
    /rounded-2xl border border-border\/60 bg-card p-4 shadow-none/,
  );
});
