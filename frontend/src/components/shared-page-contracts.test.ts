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
const globals = readSource("../app/globals.css");
const buttonPrimitive = readSource("../components/ui/button.tsx");
const selectPrimitive = readSource("../components/ui/select.tsx");
const dropdownMenuPrimitive = readSource(
  "../components/ui/dropdown-menu.tsx",
);
const appSidebar = readSource("../components/app-sidebar.tsx");
const sidebarPrimitive = readSource("../components/ui/sidebar.tsx");
const sidebarNavItem = readSource("../components/ui/sidebar-nav-item.tsx");
const sidebarMotionExample = readSource(
  "../components/shared/design-system/examples/sidebar-motion-example.tsx",
);
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
const riskRegisterForm = readSource(
  "../app/(app)/risk/register/new/page.tsx",
);
const roPicker = readSource("../components/risk/ro-picker.tsx");
const remoteUserPicker = readSource(
  "../components/risk/remote-user-picker.tsx",
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
  assert.match(designSystemPage, /<IconographyExample\s*\/>/);
  assert.match(designSystemPage, /<SidebarMotionExample\s*\/>/);
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
  assert.match(designSystemDocument, /All application icons use Hugeicons/);
  assert.match(designSystemDocument, /Sidebar icon motion/);
});

test("sidebar navigation uses reusable, reduced-motion-safe icon micro-interactions", () => {
  assert.match(sidebarNavItem, /whileHover=\{reducedMotion \? undefined : "hover"\}/);
  assert.match(sidebarNavItem, /whileTap=\{reducedMotion \? undefined : "tap"\}/);
  assert.match(sidebarNavItem, /scale: 1\.08/);
  assert.match(sidebarNavItem, /scale: 0\.92/);
  assert.match(sidebarNavItem, /duration: 0\.18/);
  assert.match(sidebarNavItem, /duration: 0\.35/);
  assert.match(sidebarNavItem, /layoutId="sidebar-active-background"/);
  assert.match(sidebarNavItem, /layoutId="sidebar-active-indicator"/);
  assert.match(sidebarNavItem, /MotionConfig reducedMotion="user"/);
  assert.doesNotMatch(sidebarNavItem, /transition: all/);
  assert.match(sidebarMotionExample, /Dashboard/);
  assert.match(sidebarMotionExample, /Library/);
  assert.match(sidebarMotionExample, /Search/);
});

test("the design system documents its canonical component ownership", () => {
  assert.match(designSystemDocument, /@\/components\/shared\/design-system/);
  assert.match(designSystemDocument, /examples.*fixture/i);
  assert.match(designSystemDocument, /must not deep-import/i);
  assert.match(designSystemDocument, /collection-primitives\.tsx.*removed/i);
});

test("clickable controls expose a pointer cursor while disabled controls stay not-allowed", () => {
  assert.match(globals, /button:not\(:disabled\)/);
  assert.match(globals, /\[role="button"\]/);
  assert.match(globals, /cursor: pointer/);
  assert.match(globals, /button:disabled/);
  assert.match(globals, /cursor: not-allowed/);
  assert.match(buttonPrimitive, /cursor-pointer/);
  assert.match(buttonPrimitive, /disabled:cursor-not-allowed/);
  assert.match(selectPrimitive, /SelectItem[\s\S]*cursor-pointer/);
  assert.match(dropdownMenuPrimitive, /DropdownMenuItem[\s\S]*cursor-pointer/);
});

test("light neutral hover surfaces stay lighter than the previous accent fill", () => {
  assert.match(globals, /--muted: #f7f7f7/);
  assert.match(globals, /--accent: #f6f6f6/);
  assert.match(globals, /--sidebar-accent: #f6f6f6/);
  assert.match(designSystemDocument, /Accent Surface.*#F6F6F6/);
  assert.match(designSystemDocument, /Subtle Surface.*#F7F7F7/);
  assert.match(appSidebar, /hover:bg-sidebar-accent/);
  assert.match(sidebarNavItem, /data-active:bg-transparent/);
  assert.match(sidebarNavItem, /bg-sidebar-accent/);
  assert.doesNotMatch(appSidebar, /muted-foreground\/10/);
});

test("sidebar active navigation uses the semibold weight tier", () => {
  assert.match(sidebarPrimitive, /data-active:font-semibold/);
  assert.doesNotMatch(sidebarPrimitive, /data-active:font-medium/);
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
    /className="space-y-5"/,
  );
  const mitigationDialog = readSource(
    "../components/shared/design-system/domain/mitigation-progress-dialog.tsx",
  );
  const mitigationForm = readSource(
    "../components/shared/design-system/domain/mitigation-progress-form.tsx",
  );
  assert.match(mitigationDialog, /className=\{cn\("max-w-2xl"/);
  assert.match(mitigationDialog, /showCloseButton=\{false\}/);
  assert.match(mitigationDialog, /variant="secondary"/);
  assert.match(mitigationDialog, /size="primary"/);
  assert.match(mitigationDialog, /DialogTitle className="text-base"/);
  assert.doesNotMatch(mitigationDialog, /DialogDescription/);
  assert.match(mitigationForm, /<Label className="text-sm"/);
  assert.match(mitigationForm, /className="flex flex-col gap-2"/);
});

test("risk form custom popover triggers keep neutral focus borders and animate chevrons", () => {
  for (const [name, source, group] of [
    ["risk register popover select", riskRegisterForm, "risk-select"],
    ["RO picker", roPicker, "ro-picker"],
    ["remote user picker", remoteUserPicker, "remote-user-picker"],
  ] as const) {
    assert.match(source, /focus:border-border/);
    assert.match(source, /focus-visible:border-border/);
    assert.match(source, /focus:ring-0/);
    assert.match(source, /active:translate-y-0/);
    assert.match(source, /active:scale-100/);
    assert.match(source, new RegExp(`group-data-\\[state=open\\]\\/${group}:rotate-180`));
    assert.match(source, /transition-transform duration-150 ease-\(--ease-out\)/);
    assert.match(source, /motion-reduce:transition-none/);
    assert.doesNotMatch(source, /focus:border-black/);
    assert.doesNotMatch(source, /focus-visible:border-black/);
    assert.doesNotMatch(source, /focus-visible:border-ring/);
    assert.doesNotMatch(source, /focus-visible:ring-2/);
    assert.ok(source, `${name} source must be present`);
  }
  assert.match(riskRegisterForm, /aria-expanded:bg-card/);
  assert.match(roPicker, /aria-expanded:bg-card/);
});
