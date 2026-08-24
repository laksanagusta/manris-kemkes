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
const dialogPrimitive = readSource("../components/ui/dialog.tsx");
const alertDialogPrimitive = readSource("../components/ui/alert-dialog.tsx");
const sheetPrimitive = readSource("../components/ui/sheet.tsx");
const collectionDialogCancel = readSource(
  "../components/shared/design-system/collections/collection-dialog-cancel.tsx",
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
const workingPaperCreateDialog = readSource(
  "../components/shared/working-paper-create-dialog.tsx",
);
const riskRegisterForm = readSource(
  "../app/(app)/risk/register/new/page.tsx",
);
const roPicker = readSource("../components/risk/ro-picker.tsx");
const remoteUserPicker = readSource(
  "../components/risk/remote-user-picker.tsx",
);
const editableItemsTable = readSource(
  "../components/shared/editable-items-table.tsx",
);
const aiSuggestionModal = readSource(
  "../components/shared/ai-suggestion-modal.tsx",
);
const riskScoreHeatmapPicker = readSource(
  "../components/shared/design-system/domain/risk-score-heatmap-picker.tsx",
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

test("mitigation detail-to-report handoff follows the dialog exit lifecycle", () => {
  assert.match(mitigationPanel, /useReducedMotion/);
  assert.match(mitigationPanel, /pendingReportTaskRef/);
  assert.equal(
    mitigationPanel.match(/handleOpenSubmitFromDetail\(detailTask\)/g)?.length,
    2,
  );
  assert.doesNotMatch(
    mitigationPanel,
    /setShowDetailDialog\(false\);\s*handleOpenSubmit\(detailTask\)/,
  );
  assert.match(mitigationPanel, /onAnimationEnd=\{\(event\) =>/);
  assert.match(mitigationPanel, /event\.currentTarget !== event\.target/);
  assert.match(mitigationPanel, /event\.animationName !== "exit"/);
  assert.match(mitigationPanel, /window\.requestAnimationFrame\(flushPendingReport\)/);
  assert.match(mitigationPanel, /className="max-w-2xl no-scrollbar"/);
  assert.match(mitigationPanel, /showCloseButton=\{false\}/);
  assert.doesNotMatch(mitigationPanel, /DialogDescription/);
  assert.match(mitigationPanel, /className="space-y-6 motion-safe:animate-in/);
  assert.match(mitigationPanel, /className="space-y-4"/);
  assert.match(mitigationPanel, /className="grid gap-x-6 gap-y-5 md:grid-cols-2"/);
  assert.match(mitigationPanel, /Tindakan Penanganan/);
  assert.match(mitigationPanel, /CalendarDays/);
  assert.match(mitigationPanel, /CalendarClock/);
  assert.match(mitigationPanel, /Link2/);
  assert.match(mitigationPanel, /MessageSquare/);
  assert.match(mitigationPanel, /DialogFooter className="gap-2 sm:justify-between/);
  assert.match(
    mitigationPanel,
    /<CollectionDialogCancel[\s\S]*>\s*Tutup\s*<\/CollectionDialogCancel>[\s\S]*detailTask\.status === "pending"/,
  );
  assert.doesNotMatch(
    mitigationPanel,
    /h-9 items-center rounded-lg border border-border bg-card/,
  );
  assert.match(
    mitigationPanel,
    /className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30"/,
  );
  assert.match(
    mitigationPanel,
    /DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-\(--ease-out\) motion-safe:fill-mode-both"/,
  );
  assert.match(mitigationPanel, /motion-safe:delay-\[40ms\]/);
  assert.match(mitigationPanel, /motion-safe:delay-\[80ms\]/);
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

test("working paper create dialog follows the shared mitigation modal shell", () => {
  assert.match(
    workingPaperCreateDialog,
    /<DialogContent className="max-w-2xl no-scrollbar" showCloseButton=\{false\}>/,
  );
  assert.match(workingPaperCreateDialog, /<DialogTitle className="text-base">/);
  assert.match(workingPaperCreateDialog, /<Label htmlFor="working-paper-period"/);
  assert.match(workingPaperCreateDialog, /<Popover open=/);
  assert.match(workingPaperCreateDialog, /<PopoverContent/);
  assert.match(workingPaperCreateDialog, /role="combobox"/);
  assert.match(workingPaperCreateDialog, /role="option"/);
  assert.doesNotMatch(workingPaperCreateDialog, /SelectItem|SelectContent/);
  assert.match(workingPaperCreateDialog, /<CollectionDialogCancel/);
  assert.match(workingPaperCreateDialog, /<AccentButton type="submit"/);
  assert.match(workingPaperCreateDialog, /motion-safe:delay-\[40ms\]/);
  assert.match(workingPaperCreateDialog, /motion-safe:delay-\[80ms\]/);
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
  assert.doesNotMatch(sidebarNavItem, /sidebar-active-indicator/);
  assert.match(
    sidebarNavItem,
    /isActive\s*\?\s*"!text-sidebar-accent-foreground"\s*:\s*"!text-sidebar-foreground\/60"/,
  );
  assert.match(sidebarNavItem, /MotionConfig reducedMotion="user"/);
  assert.doesNotMatch(sidebarNavItem, /transition: all/);
  assert.match(sidebarPrimitive, /data-slot="sidebar-menu"[\s\S]*flex-col gap-1/);
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

test("neutral hover surfaces share the sidebar menu color", () => {
  assert.match(globals, /--muted: var\(--sidebar-accent\)/);
  assert.match(globals, /--accent: var\(--sidebar-accent\)/);
  assert.match(globals, /--sidebar-accent: #f6f6f6/);
  assert.match(designSystemDocument, /Accent Surface.*#F6F6F6/);
  assert.match(designSystemDocument, /Subtle Surface.*#F6F6F6/);
  assert.match(designSystemDocument, /Generic neutral hover and selected surfaces resolve to the shared sidebar menu surface through `--sidebar-accent`/);
  assert.match(appSidebar, /hover:bg-sidebar-accent/);
  assert.match(sidebarNavItem, /data-active:bg-transparent/);
  assert.match(sidebarNavItem, /bg-sidebar-accent/);
  assert.doesNotMatch(appSidebar, /muted-foreground\/10/);
});

test("modal surfaces use the xl smooth shadow ring", () => {
  for (const [name, source] of Object.entries({
    dialog: dialogPrimitive,
    alertDialog: alertDialogPrimitive,
    sheet: sheetPrimitive,
  })) {
    assert.match(
      source,
      /smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300\/30/,
      `${name} must use the xl smooth shadow ring`,
    );
    assert.doesNotMatch(
      source,
      /smooth-shadow-ring-xs/,
      `${name} must not keep the xs modal shadow`,
    );
  }
});

test("modal surfaces share the mitigation dialog shell contract", () => {
  assert.match(dialogPrimitive, /no-scrollbar/);
  assert.match(alertDialogPrimitive, /no-scrollbar/);
  assert.match(sheetPrimitive, /bg-card/);
  assert.match(sheetPrimitive, /no-scrollbar/);
  assert.match(collectionDialogCancel, /variant="outline"/);
  assert.match(collectionDialogCancel, /size="md"/);
  assert.match(collectionDialogCancel, /border-0/);
  assert.match(
    collectionDialogCancel,
    /smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
  );
  assert.match(designSystemDocument, /\*\*Modal family:/);
  assert.match(designSystemDocument, /\*\*Modal composition:/);
});

test("dialog and alert dialog use the shared 200ms ease-out motion", () => {
  for (const [name, source] of Object.entries({
    dialog: dialogPrimitive,
    alertDialog: alertDialogPrimitive,
  })) {
    assert.match(source, /duration-200 ease-\(--ease-out\)/, `${name} must use the shared modal timing`);
    assert.match(source, /motion-reduce:animate-none/);
    assert.match(source, /motion-reduce:transition-none/);
    assert.doesNotMatch(source, /duration-100/);
  }
});

test("editable inline list rows animate only newly inserted items", () => {
  assert.match(editableItemsTable, /transition-colors/);
  assert.match(editableItemsTable, /hover:bg-muted\/30/);
  assert.match(editableItemsTable, /border-t-0/);
  assert.match(editableItemsTable, /animatingItemIds\.has\(item\.id\)/);
  assert.match(editableItemsTable, /motion-safe:animate-in/);
  assert.match(editableItemsTable, /motion-safe:slide-in-from-top-2/);
  assert.match(editableItemsTable, /motion-safe:duration-200/);
  assert.match(editableItemsTable, /motion-reduce:animate-none/);
  assert.doesNotMatch(editableItemsTable, /divide-y/);
  assert.doesNotMatch(editableItemsTable, /animationDelay/);
  assert.doesNotMatch(editableItemsTable, /transition-all/);
});

test("structured AI suggestions show a stable mono selection count", () => {
  assert.match(aiSuggestionModal, /isStructuredList \? \(/);
  assert.match(aiSuggestionModal, /\{selectedIds\.size\}\/\{suggestions\.length\} saran dipilih/);
  assert.match(aiSuggestionModal, /font-mono text-xs tabular-nums/);
  assert.match(aiSuggestionModal, /aria-live="polite"/);
  assert.match(aiSuggestionModal, /sm:justify-between/);
});

test("risk score selection uses the shared accessible heatmap picker", () => {
  assert.match(riskRegisterForm, /<RiskScoreHeatmapModal/);
  assert.match(riskRegisterForm, /<RiskScorePickerTrigger/);
  assert.doesNotMatch(riskRegisterForm, /Klik heatmap untuk memilih kombinasi/);
  assert.doesNotMatch(riskRegisterForm, /<RiskRatingSlider/);
  assert.match(riskScoreHeatmapPicker, /showCloseButton=\{false\}/);
  assert.match(riskScoreHeatmapPicker, /<DialogHeader className="gap-0">/);
  assert.match(riskScoreHeatmapPicker, /<DialogDescription className="mt-0.5 max-w-xl">/);
  assert.match(riskScoreHeatmapPicker, /grid-cols-\[minmax\(76px,1\.2fr\)_repeat\(5/);
  assert.match(riskScoreHeatmapPicker, /aria-pressed=\{isSelected\}/);
  assert.match(riskScoreHeatmapPicker, /ArrowRight/);
  assert.match(riskScoreHeatmapPicker, /Terapkan Skor/);
  assert.match(riskScoreHeatmapPicker, /z-10 border-2 border-foreground/);
  assert.doesNotMatch(
    riskScoreHeatmapPicker,
    /border-foreground ring-2 ring-foreground\/70 ring-offset-2 ring-offset-card/,
  );
  assert.match(riskScoreHeatmapPicker, /min-h-12/);
  assert.match(riskScoreHeatmapPicker, /font-mono text-base font-semibold tabular-nums/);
  assert.match(
    riskScoreHeatmapPicker,
    /min-h-11 w-fit max-w-full self-start items-center justify-between/,
  );
  assert.doesNotMatch(riskScoreHeatmapPicker, /min-h-11 w-full items-center/);
  assert.match(
    riskScoreHeatmapPicker,
    /text-3xl font-mono font-medium leading-none tracking-tight text-foreground tabular-nums/,
  );
  assert.doesNotMatch(riskScoreHeatmapPicker, /P\{probability\} × D\{impact\}/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /text-sm font-medium text-foreground">\{title\}/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /PROBABILITY_LABELS\[probability\]/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /IMPACT_LABELS\[impact\]/);
  assert.match(riskScoreHeatmapPicker, /sm:grid-cols-3/);
  assert.match(riskScoreHeatmapPicker, /Probabilitas/);
  assert.match(riskScoreHeatmapPicker, /Dampak/);
  assert.match(riskScoreHeatmapPicker, /Hasil/);
  assert.match(riskScoreHeatmapPicker, /pb-3 sm:pb-4/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /pt-1|sm:pt-2/);
  assert.match(
    riskScoreHeatmapPicker,
    /pt-3 no-scrollbar sm:flex-none sm:overflow-visible/,
  );
  assert.match(riskScoreHeatmapPicker, /sm:min-h-14/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /sm:min-h-16/);
  assert.match(riskScoreHeatmapPicker, /font-mono text-2xl font-semibold leading-none tabular-nums/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /bg-muted\/\[0\.18\]/);
  assert.equal(
    (riskScoreHeatmapPicker.match(/rounded-xl border border-border\/60 bg-card px-3 py-2\.5/g) ?? [])
      .length,
    1,
  );
  assert.doesNotMatch(riskScoreHeatmapPicker, /Probabilitas × Dampak/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /<span>Probabilitas<\/span>/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /<span>Dampak<\/span>/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /Pilihan saat ini/);
  assert.doesNotMatch(riskScoreHeatmapPicker, /bg-muted px-2\.5 py-1 font-mono/);
});

test("sidebar footer fades into the help and account chrome", () => {
  assert.match(appSidebar, /<SidebarFooter className="relative isolate space-y-2">/);
  assert.match(
    appSidebar,
    /aria-hidden="true"[\s\S]*-top-10 z-10 h-10 bg-gradient-to-b from-transparent via-sidebar\/75 to-sidebar backdrop-blur-md/,
  );
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
  assert.match(mitigationDialog, /className=\{cn\("max-w-2xl no-scrollbar"/);
  assert.match(mitigationDialog, /max-w-2xl no-scrollbar/);
  assert.match(mitigationDialog, /showCloseButton=\{false\}/);
  assert.match(mitigationDialog, /variant="outline"/);
  assert.match(mitigationDialog, /size="md"/);
  assert.match(
    mitigationDialog,
    /smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
  );
  assert.match(mitigationDialog, /DialogTitle className="text-base"/);
  assert.doesNotMatch(mitigationDialog, /DialogDescription/);
  assert.match(mitigationDialog, /motion-safe:animate-in/);
  assert.match(mitigationDialog, /motion-safe:fade-in-0/);
  assert.match(mitigationDialog, /motion-safe:slide-in-from-bottom-1/);
  assert.match(mitigationDialog, /motion-safe:duration-200/);
  assert.match(mitigationDialog, /motion-safe:ease-\(--ease-out\)/);
  assert.match(mitigationDialog, /motion-safe:fill-mode-both/);
  assert.match(mitigationDialog, /motion-safe:delay-\[40ms\]/);
  assert.match(mitigationDialog, /motion-safe:delay-\[80ms\]/);
  assert.doesNotMatch(mitigationDialog, /transition-all/);
  assert.match(mitigationForm, /<Input[\s\S]*required[\s\S]*aria-required="true"/);
  assert.match(mitigationForm, /<Textarea[\s\S]*required[\s\S]*aria-required="true"/);
  assert.equal((mitigationForm.match(/role="alert"/g) ?? []).length, 2);
  assert.equal(
    (mitigationForm.match(/motion-safe:animate-in[\s\S]*?motion-safe:ease-\(--ease-out\)/g) ?? []).length,
    2,
  );
  assert.match(mitigationForm, /motion-safe:fade-in-0/);
  assert.match(mitigationForm, /motion-safe:slide-in-from-top-1/);
  assert.match(mitigationForm, /motion-safe:duration-150/);
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
