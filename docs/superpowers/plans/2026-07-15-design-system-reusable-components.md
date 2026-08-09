# Design System Reusable Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `frontend/src/components/shared/design-system` the single public home for reusable Manris composed components, split the collection monolith into focused files, and make catalogue examples consume the production implementations without changing visuals or behavior.

**Architecture:** Production components are grouped internally by responsibility but exported only through `@/components/shared/design-system`. Catalogue-only renderers and fixtures live behind `design-system/examples`, while feature pages own fetching, routing, permissions, and business state. The migration is contract-first and removes the old collection module without a compatibility shim.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Node test runner, ESLint.

---

## Preflight and Safety

The current worktree contains many user changes, and the entire Design System folder plus `collection-primitives.tsx` are currently untracked. A fresh worktree created from `HEAD` would omit those files. Therefore, execute this plan in the current workspace unless the user first commits the full baseline. Never reset, stash, overwrite, or stage unrelated files.

Before every task:

```bash
git status --short --branch
```

Stage only the paths named by that task. Use `git diff --cached --name-only` before each commit.

## Target File Map

### Production files

```text
frontend/src/components/shared/design-system/
├── index.ts
├── actions/
│   ├── accent-button.tsx
│   ├── action-button.tsx
│   ├── action-icon-button.tsx
│   ├── dialog-action-list.tsx
│   ├── dropdown-action-menu.tsx
│   └── loading-action-button.tsx
├── collections/
│   ├── collection-dialog-cancel.tsx
│   ├── collection-empty-state.tsx
│   ├── collection-error-state.tsx
│   ├── collection-filter-grid.tsx
│   ├── collection-filter-input.tsx
│   ├── collection-filter-popover.tsx
│   ├── collection-filter-trigger.tsx
│   ├── collection-loading-state.tsx
│   ├── collection-notice.tsx
│   ├── collection-pagination.tsx
│   ├── collection-search-field.tsx
│   ├── collection-status-badge.tsx
│   ├── collection-table-card.tsx
│   ├── collection-table-head.tsx
│   ├── collection-table-header-row.tsx
│   ├── collection-table-header.tsx
│   ├── collection-tabs-list.tsx
│   ├── collection-tabs-trigger.tsx
│   ├── collection-toolbar.tsx
│   ├── expandable-search-field.tsx
│   └── sidebar-tabs-list.tsx
├── feedback/
│   ├── archived-banner.tsx
│   ├── inline-empty-state.tsx
│   ├── progress-meter.tsx
│   └── version-timeline.tsx
├── layout/
│   ├── dashboard-kpi-card.tsx
│   ├── accordion-form-section.tsx
│   ├── form-container.tsx
│   ├── metric-grid.tsx
│   ├── page-header.tsx
│   ├── page-stack.tsx
│   └── standard-card.tsx
├── reports/
│   ├── report-drilldown-summary.tsx
│   ├── report-empty-state.tsx
│   ├── report-grid.tsx
│   ├── report-link-grid.tsx
│   └── report-panel.tsx
├── domain/
│   ├── ai-suggestion-dropdown.tsx
│   ├── mitigation-progress-dialog.tsx
│   ├── mitigation-progress-form-shell.tsx
│   ├── mitigation-progress-form.tsx
│   ├── overview-category-card.tsx
│   ├── overview-panel-state.tsx
│   ├── overview-top-risks-card.tsx
│   ├── overview-trend-card.tsx
│   ├── risk-assessment-summary-strip.tsx
│   └── semester-indicator.tsx
├── examples/
│   ├── index.ts
│   └── *-example.tsx
└── data/
│   ├── color-tokens.ts
│   ├── overview-fixtures.ts
│   └── radius-tokens.ts
```

`*-example.tsx` files are catalogue consumers corresponding to the current `*-preview.tsx` files. Catalogue-only files include color, typography, radius, section-label, and composite example renderers. The `data/` folder is catalogue-only and is re-exported through `examples/index.ts`, never through the production root barrel.

### Files removed after migration

```text
frontend/src/components/shared/collection-primitives.tsx
frontend/src/components/shared/card-patterns.tsx
frontend/src/components/shared/report-primitives.tsx
frontend/src/components/shared/risk-assessment-summary-strip.tsx
frontend/src/components/shared/design-system/*.tsx  # old flat implementations/previews only
frontend/src/components/shared/design-system/data.ts
```

Do not remove an old path until `rg` confirms that no consumer imports it.

---

### Task 1: Add Architecture Contract Tests

**Files:**
- Create: `frontend/src/components/design-system-architecture.test.ts`
- Modify: `frontend/src/components/shared-page-contracts.test.ts`
- Modify: `frontend/src/components/shared-management-report-page-contracts.test.ts`

- [ ] **Step 1: Write the failing architecture contract**

Create `frontend/src/components/design-system-architecture.test.ts` with recursive source discovery and these explicit contracts:

```ts
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, relative } from "node:path";
import test from "node:test";

const srcRoot = new URL("../", import.meta.url);
const designSystemRoot = new URL("./shared/design-system/", import.meta.url);

function sourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return sourceFiles(child);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : [];
  });
}

const read = (file: URL) => readFileSync(file, "utf8");

test("the removed collection module has no consumers", () => {
  for (const file of sourceFiles(srcRoot)) {
    assert.doesNotMatch(
      read(file),
      /@\/components\/shared\/collection-primitives/,
      relative(srcRoot.pathname, file.pathname),
    );
  }
  assert.equal(
    existsSync(new URL("./shared/collection-primitives.tsx", import.meta.url)),
    false,
  );
});

test("production consumers use the root design-system API", () => {
  for (const file of sourceFiles(srcRoot)) {
    const path = relative(srcRoot.pathname, file.pathname);
    if (path.startsWith("components/shared/design-system/")) continue;
    assert.doesNotMatch(
      read(file),
      /@\/components\/shared\/design-system\//,
      path,
    );
  }
});

test("production design-system internals do not import their root barrel", () => {
  for (const file of sourceFiles(designSystemRoot)) {
    const path = relative(designSystemRoot.pathname, file.pathname);
    if (path.startsWith("examples/")) continue;
    assert.doesNotMatch(
      read(file),
      /from ["']@\/components\/shared\/design-system["']/,
      path,
    );
  }
});

test("the production barrel excludes catalogue modules", () => {
  const barrel = read(new URL("./index.ts", designSystemRoot));
  assert.doesNotMatch(barrel, /preview|example|\/data/);
});

test("catalogue examples import production components", () => {
  const documentationOnly = new Set([
    "color-swatch.tsx",
    "radius-scale-example.tsx",
    "section-label.tsx",
    "typography-example.tsx",
  ]);
  const examples = sourceFiles(new URL("./examples/", designSystemRoot))
    .filter((file) => file.pathname.endsWith(".tsx"));
  assert.ok(examples.length > documentationOnly.size);
  for (const file of examples) {
    const name = file.pathname.split("/").at(-1) ?? "";
    if (documentationOnly.has(name)) continue;
    assert.match(
      read(file),
      /@\/components\/shared\/design-system/,
      name,
    );
  }
});
```

- [ ] **Step 2: Run the contract and verify the expected failure**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/design-system-architecture.test.ts
```

Expected: FAIL because `collection-primitives.tsx` exists, old imports exist, and `examples/` has not been created.

- [ ] **Step 3: Update existing tests to read the future canonical paths**

Change source fixtures as follows; keep every existing assertion unless it checks an obsolete path:

```ts
const collectionPagination = readSource(
  "../components/shared/design-system/collections/collection-pagination.tsx",
);
const mitigationProgressDialogExample = readSource(
  "../components/shared/design-system/examples/mitigation-progress-dialog-example.tsx",
);
const mitigationProgressFormExample = readSource(
  "../components/shared/design-system/examples/mitigation-progress-form-example.tsx",
);
```

Replace assertions for deep imports with root-barrel imports:

```ts
assert.match(source, /from "@\/components\/shared\/design-system"/);
assert.doesNotMatch(source, /from "@\/components\/shared\/design-system\//);
```

Do not commit this task yet: the intentionally failing contract becomes green through Tasks 2–7.

---

### Task 2: Split Collection Primitives Into Focused Files

**Files:**
- Create: every file listed under `design-system/collections/` in the target map
- Modify: `frontend/src/components/shared/design-system/index.ts`
- Modify: every source currently importing `@/components/shared/collection-primitives`
- Delete: `frontend/src/components/shared/collection-primitives.tsx`
- Test: `frontend/src/components/design-system-architecture.test.ts`
- Test: `frontend/src/components/shared/collection-table-border.test.ts`

- [ ] **Step 1: Record the exact symbol-to-file extraction map**

Use this mapping; preserve each current JSX body and class string byte-for-byte:

```text
CollectionLoadingState        -> collections/collection-loading-state.tsx
CollectionEmptyState          -> collections/collection-empty-state.tsx
CollectionErrorState          -> collections/collection-error-state.tsx
CollectionTabsList            -> collections/collection-tabs-list.tsx
CollectionTabsTrigger         -> collections/collection-tabs-trigger.tsx
CollectionSearchField         -> collections/collection-search-field.tsx
ExpandableSearchField         -> collections/expandable-search-field.tsx
CollectionFilterTrigger       -> collections/collection-filter-trigger.tsx
CollectionToolbar             -> collections/collection-toolbar.tsx
CollectionFilterGrid          -> collections/collection-filter-grid.tsx
CollectionNotice              -> collections/collection-notice.tsx
CollectionFilterInput         -> collections/collection-filter-input.tsx
CollectionStatusBadge         -> collections/collection-status-badge.tsx
CollectionDialogCancel        -> collections/collection-dialog-cancel.tsx
SidebarTabsList               -> collections/sidebar-tabs-list.tsx
CollectionTableCard           -> collections/collection-table-card.tsx
CollectionTableHeader         -> collections/collection-table-header.tsx
CollectionTableHeaderRow      -> collections/collection-table-header-row.tsx
CollectionTableHead           -> collections/collection-table-head.tsx
CollectionPagination          -> collections/collection-pagination.tsx
```

Only `ExpandableSearchField` and interactive controls need `"use client"`. Import dependencies directly from `components/ui`, `lib/utils`, or sibling files. Do not import from the root barrel inside production Design System internals because that creates cycles.

- [ ] **Step 2: Add one export per focused module to the root barrel**

Add explicit exports; do not use `export *`:

```ts
export { CollectionDialogCancel } from "./collections/collection-dialog-cancel";
export { CollectionEmptyState } from "./collections/collection-empty-state";
export { CollectionErrorState } from "./collections/collection-error-state";
export { CollectionFilterGrid } from "./collections/collection-filter-grid";
export { CollectionFilterInput } from "./collections/collection-filter-input";
export { CollectionFilterTrigger } from "./collections/collection-filter-trigger";
export { CollectionLoadingState } from "./collections/collection-loading-state";
export { CollectionNotice } from "./collections/collection-notice";
export { CollectionPagination } from "./collections/collection-pagination";
export { CollectionSearchField } from "./collections/collection-search-field";
export { CollectionStatusBadge } from "./collections/collection-status-badge";
export { CollectionTableCard } from "./collections/collection-table-card";
export { CollectionTableHead } from "./collections/collection-table-head";
export { CollectionTableHeader } from "./collections/collection-table-header";
export { CollectionTableHeaderRow } from "./collections/collection-table-header-row";
export { CollectionTabsList } from "./collections/collection-tabs-list";
export { CollectionTabsTrigger } from "./collections/collection-tabs-trigger";
export { CollectionToolbar } from "./collections/collection-toolbar";
export { ExpandableSearchField } from "./collections/expandable-search-field";
export { SidebarTabsList } from "./collections/sidebar-tabs-list";
```

- [ ] **Step 3: Migrate every old collection import**

Find the complete consumer set:

```bash
rg -l '@/components/shared/collection-primitives' frontend/src
```

For every result, merge collection symbols into an existing root Design System import or add:

```ts
import {
  CollectionPagination,
  CollectionToolbar,
} from "@/components/shared/design-system";
```

The exact imported symbol list remains consumer-specific. Do not change JSX, props, ordering, or state.

- [ ] **Step 4: Delete the monolith and update its focused border test**

Delete `frontend/src/components/shared/collection-primitives.tsx`. Update `collection-table-border.test.ts` to read `collection-table-card.tsx` and `collection-table-header.tsx` separately while preserving the existing class assertions.

- [ ] **Step 5: Verify collection migration**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/components/shared/collection-table-border.test.ts \
  src/components/design-system-architecture.test.ts
```

Expected: collection border tests PASS; architecture test may still FAIL only for not-yet-created examples or remaining deep Design System imports.

- [ ] **Step 6: Commit only collection migration paths**

```bash
git add frontend/src/components/shared/design-system/collections \
  frontend/src/components/shared/design-system/index.ts \
  frontend/src/components/design-system-architecture.test.ts \
  frontend/src/components/shared/collection-table-border.test.ts
git add -p frontend/src/app frontend/src/components
git diff --cached --name-only
git commit -m "refactor: split design system collection components"
```

During `git add -p`, accept only hunks that replace the old collection import with the root Design System import. Reject every pre-existing user hunk. If an import edit shares one inseparable hunk with unrelated user work, leave that file unstaged and include it in the later consumer-migration commit after obtaining a clean patch boundary.

---

### Task 3: Split Actions, Layout, and Report Components

**Files:**
- Create: `frontend/src/components/shared/design-system/actions/*.tsx`
- Create: `frontend/src/components/shared/design-system/layout/{dashboard-kpi-card,metric-grid,page-stack,standard-card}.tsx`
- Create: `frontend/src/components/shared/design-system/reports/*.tsx`
- Modify: `frontend/src/components/shared/design-system/index.ts`
- Modify: consumers found by `rg` for the old modules
- Delete: old flat production files and shared proxy modules listed below
- Test: `frontend/src/components/shared-management-report-page-contracts.test.ts`

- [ ] **Step 1: Write failing public API assertions**

Add these assertions to the management/report contract test:

```ts
const designSystemBarrel = readSource("./shared/design-system/index.ts");

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
```

- [ ] **Step 2: Split existing multi-export files without changing implementation**

Apply this mapping:

```text
action-buttons.tsx / AccentButton          -> actions/accent-button.tsx
action-buttons.tsx / ActionIconButton      -> actions/action-icon-button.tsx
action-buttons.tsx / ActionButton          -> actions/action-button.tsx
loading-action-button-preview behavior     -> actions/loading-action-button.tsx
page-layout.tsx / PageStack                -> layout/page-stack.tsx
page-layout.tsx / MetricGrid               -> layout/metric-grid.tsx
dashboard-kpi-card.tsx                     -> layout/dashboard-kpi-card.tsx
shared/card-patterns.tsx / StandardCard    -> layout/standard-card.tsx
design-system/card.tsx                    -> direct root-barrel re-export from components/ui/card
report-primitives.tsx / ReportGrid         -> reports/report-grid.tsx
report-primitives.tsx / ReportPanel        -> reports/report-panel.tsx
report-primitives.tsx / ReportEmptyState   -> reports/report-empty-state.tsx
report-primitives.tsx / ReportDrilldownSummary -> reports/report-drilldown-summary.tsx
report-primitives.tsx / ReportLinkGrid     -> reports/report-link-grid.tsx
```

`LoadingActionButton` must use the current preview's loading markup but expose production props:

```ts
type LoadingActionButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingLabel?: string;
};
```

It forwards all button props, sets `disabled={loading || disabled}`, and swaps only the visible content while loading.

Preserve the current `Card`, `CardAction`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, and `CardTitle` public names with a direct export in `design-system/index.ts`:

```ts
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
```

This keeps `components/ui/card.tsx` as the implementation owner and removes the redundant flat proxy.

- [ ] **Step 3: Replace proxy and deep imports**

Run:

```bash
rg -l '@/components/shared/(card-patterns|report-primitives)|design-system/(action-buttons|page-layout|dashboard-kpi-card|report-primitives)' frontend/src
```

Change every production consumer to the root import. Change internal Design System files to sibling relative imports. Delete:

```text
frontend/src/components/shared/card-patterns.tsx
frontend/src/components/shared/report-primitives.tsx
frontend/src/components/shared/design-system/action-buttons.tsx
frontend/src/components/shared/design-system/page-layout.tsx
frontend/src/components/shared/design-system/dashboard-kpi-card.tsx
frontend/src/components/shared/design-system/report-primitives.tsx
frontend/src/components/shared/design-system/card.tsx
```

- [ ] **Step 4: Run focused tests**

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/components/shared-management-report-page-contracts.test.ts
```

Expected: PASS with root-barrel imports and unchanged layout/report assertions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/design-system/actions \
  frontend/src/components/shared/design-system/layout \
  frontend/src/components/shared/design-system/reports \
  frontend/src/components/shared/design-system/index.ts \
  frontend/src/components/shared-management-report-page-contracts.test.ts
git add -p frontend/src/components/shared frontend/src/app
git diff --cached --name-only
git commit -m "refactor: organize design system production primitives"
```

---

### Task 4: Extract Reusable Production Patterns From Previews

**Files:**
- Create: `frontend/src/components/shared/design-system/feedback/*.tsx`
- Create: `frontend/src/components/shared/design-system/domain/*.tsx`
- Create: `frontend/src/components/shared/design-system/actions/{dialog-action-list,dropdown-action-menu}.tsx`
- Create: `frontend/src/components/shared/design-system/collections/collection-filter-popover.tsx`
- Create: `frontend/src/components/shared/design-system/layout/{accordion-form-section,form-container,page-header}.tsx`
- Modify: `frontend/src/components/shared/design-system/index.ts`
- Delete: superseded flat production modules after consumers migrate
- Test: `frontend/src/components/design-system-components.test.ts`

- [ ] **Step 1: Write source-level public API and ownership tests**

Create `frontend/src/components/design-system-components.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const domainFiles = [
  "./shared/design-system/domain/mitigation-progress-dialog.tsx",
  "./shared/design-system/domain/mitigation-progress-form.tsx",
  "./shared/design-system/domain/risk-assessment-summary-strip.tsx",
  "./shared/design-system/domain/overview-top-risks-card.tsx",
];

test("domain components do not own API or permission behavior", () => {
  for (const path of domainFiles) {
    const source = read(path);
    assert.doesNotMatch(source, /fetch\(|apiClient|useAuth|permission|useRouter/);
  }
});

test("production component names do not use Preview suffixes", () => {
  const barrel = read("./shared/design-system/index.ts");
  assert.doesNotMatch(barrel, /Preview/);
});
```

- [ ] **Step 2: Extract feedback patterns with explicit props**

Create these production APIs using the current preview markup and unchanged class strings:

```ts
export type ArchivedBannerProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export type InlineEmptyStateProps = {
  message: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
};

export type ProgressMeterProps = {
  value: number;
  max?: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
  className?: string;
};

export type VersionTimelineItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
};

export type VersionTimelineProps = {
  items: VersionTimelineItem[];
  activeId?: string;
};
```

Clamp progress display to `0..max` while preserving the current meter geometry. Timeline keys come from `item.id`; do not derive keys from display text.

- [ ] **Step 3: Extract reusable action, filter, form, accordion, and page-header patterns**

Use the current preview markup and class strings with these production-facing props:

```ts
export type DialogActionItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onSelect: () => void;
};

export type DialogActionListProps = {
  items: DialogActionItem[];
  className?: string;
};

export type DropdownActionMenuProps = {
  label: string;
  triggerLabel: string;
  items: DialogActionItem[];
};

export type CollectionFilterPopoverProps = {
  triggerLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export type AccordionFormSectionProps = {
  value: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export type FormContainerProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};
```

`DropdownActionMenu` and `DialogActionList` share the `DialogActionItem` type from `actions/dialog-action-list.tsx`. They render supplied actions only and do not own confirmation, routing, or permission logic. `CollectionFilterPopover` owns popover geometry but not filter state. `AccordionFormSection` is an item composition used inside the existing shadcn Accordion root.

- [ ] **Step 4: Move existing domain production components**

Use this exact mapping:

```text
mitigation-progress-dialog.tsx       -> domain/mitigation-progress-dialog.tsx
mitigation-progress-form.tsx         -> domain/mitigation-progress-form.tsx
MitigationProgressFormShell export   -> domain/mitigation-progress-form-shell.tsx
overview-category-card.tsx           -> domain/overview-category-card.tsx
overview-panel-state.tsx             -> domain/overview-panel-state.tsx
overview-top-risks-card.tsx           -> domain/overview-top-risks-card.tsx
overview-trend-card.tsx               -> domain/overview-trend-card.tsx
shared/risk-assessment-summary-strip.tsx -> domain/risk-assessment-summary-strip.tsx
semester-indicator preview pattern   -> domain/semester-indicator.tsx
AI suggestion preview pattern        -> domain/ai-suggestion-dropdown.tsx
```

Preserve existing domain prop names where they already exist. Remove the hard-coded overview fixtures with these APIs:

```ts
export type OverviewCategorySegment = {
  label: string;
  value: number;
  color: string;
};

export type OverviewCategoryCardProps = {
  title?: ReactNode;
  total: number;
  totalLabel: ReactNode;
  segments: ReadonlyArray<OverviewCategorySegment>;
};

export type OverviewTrendCardProps = {
  title?: ReactNode;
  chart: ReactNode;
  legend?: ReactNode;
};

export type OverviewTopRisk = {
  id: string;
  code: string;
  title: string;
  orgName: string;
  score: number;
  levelClass: string;
  href: string;
};
```

`OverviewTopRisksCard` consumes the supplied `href` instead of constructing `/risk/register/${id}`. The feature-page mapper owns that route decision. `OverviewCategoryCard` receives all segment and total data, and `OverviewTrendCard` receives chart and legend slots so its current static SVG moves into the catalogue fixture example rather than production code.

`AiSuggestionDropdown` receives controlled `open`, `onOpenChange`, suggestions, selected value, and selection callback; it must not generate suggestions or call an endpoint. `SemesterIndicator` receives semester label, semantic status, status label, and optional action callback rather than embedding the catalogue's sample semester values.

- [ ] **Step 5: Export production components and migrate consumers**

Use explicit exports such as:

```ts
export { ArchivedBanner } from "./feedback/archived-banner";
export { DialogActionList } from "./actions/dialog-action-list";
export type { DialogActionItem } from "./actions/dialog-action-list";
export { DropdownActionMenu } from "./actions/dropdown-action-menu";
export { CollectionFilterPopover } from "./collections/collection-filter-popover";
export { AccordionFormSection } from "./layout/accordion-form-section";
export { FormContainer } from "./layout/form-container";
export { PageHeader } from "./layout/page-header";
export { InlineEmptyState } from "./feedback/inline-empty-state";
export { ProgressMeter } from "./feedback/progress-meter";
export { VersionTimeline } from "./feedback/version-timeline";
export type { VersionTimelineItem } from "./feedback/version-timeline";
export { MitigationProgressDialog } from "./domain/mitigation-progress-dialog";
export { MitigationProgressForm } from "./domain/mitigation-progress-form";
export { MitigationProgressFormShell } from "./domain/mitigation-progress-form-shell";
export { RiskAssessmentSummaryStrip } from "./domain/risk-assessment-summary-strip";
```

Migrate all production imports to the root barrel, then remove superseded flat files and `shared/risk-assessment-summary-strip.tsx`.

- [ ] **Step 6: Run focused tests**

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/components/design-system-components.test.ts \
  src/components/shared-page-contracts.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/shared/design-system/feedback \
  frontend/src/components/shared/design-system/domain \
  frontend/src/components/shared/design-system/actions \
  frontend/src/components/shared/design-system/collections \
  frontend/src/components/shared/design-system/layout \
  frontend/src/components/shared/design-system/index.ts \
  frontend/src/components/design-system-components.test.ts \
  frontend/src/components/shared-page-contracts.test.ts
git add -p frontend/src/components/shared frontend/src/app
git diff --cached --name-only
git commit -m "refactor: extract reusable design system patterns"
```

---

### Task 5: Convert Catalogue Previews Into Fixture-Driven Examples

**Files:**
- Create: `frontend/src/components/shared/design-system/examples/index.ts`
- Create: `frontend/src/components/shared/design-system/examples/*-example.tsx`
- Create: `frontend/src/components/shared/design-system/data/{color-tokens,overview-fixtures,radius-tokens}.ts`
- Modify: `frontend/src/app/(app)/design-system/page.tsx`
- Delete: current flat `*-preview.tsx`, `color-swatch.tsx`, `section-label.tsx`, and `data.ts`
- Test: `frontend/src/components/design-system-architecture.test.ts`

- [ ] **Step 1: Create a catalogue-only barrel**

Export every example from `examples/index.ts`, never from the production root barrel:

```ts
export { AccordionExample } from "./accordion-example";
export { AccentButtonExample } from "./accent-button-example";
export { ActionButtonsExample } from "./action-buttons-example";
export { AiSuggestionDropdownExample } from "./ai-suggestion-dropdown-example";
export { ArchivedBannerExample } from "./archived-banner-example";
export { BadgeSystemExample } from "./badge-system-example";
export { ButtonVariantsExample } from "./button-variants-example";
export { CardPatternsExample } from "./card-patterns-example";
export { ColorPaletteExample } from "./color-palette-example";
export { CollectionLayoutExample } from "./collection-layout-example";
export { DesignSystemColorSwatch } from "./color-swatch";
export { DesignSystemSectionLabel } from "./section-label";
export { DialogActionListExample } from "./dialog-action-list-example";
export { DialogExample } from "./dialog-example";
export { DropdownActionMenuExample } from "./dropdown-action-menu-example";
export { FilterPopoverExample } from "./filter-popover-example";
export { FormContainerExample } from "./form-container-example";
export { InlineEmptyStateExample } from "./inline-empty-state-example";
export { LoadingActionButtonExample } from "./loading-action-button-example";
export { MitigationProgressDialogExample } from "./mitigation-progress-dialog-example";
export { MitigationProgressFormExample } from "./mitigation-progress-form-example";
export { OverviewPanelStatesExample } from "./overview-panel-states-example";
export { OverviewDashboardExample } from "./overview-dashboard-example";
export { PageHeaderExample } from "./page-header-example";
export { PaginationExample } from "./pagination-example";
export { ProgressMeterExample } from "./progress-meter-example";
export { RadiusScaleExample } from "./radius-scale-example";
export { ReportPrimitivesExample } from "./report-primitives-example";
export { RiskAssessmentSummaryExample } from "./risk-assessment-summary-example";
export { RiskSummaryStripExample } from "./risk-summary-strip-example";
export { SearchInputExample } from "./search-input-example";
export { SemesterIndicatorExample } from "./semester-indicator-example";
export { TableExample } from "./table-example";
export { TabsExample } from "./tabs-example";
export { TooltipExample } from "./tooltip-example";
export { TypographyExample } from "./typography-example";
export { VersionTimelineExample } from "./version-timeline-example";
```

- [ ] **Step 2: Move fixtures and token documentation**

Split the current `data.ts` by responsibility into `data/color-tokens.ts`, `data/radius-tokens.ts`, and `data/overview-fixtures.ts`. Keep color/radius tokens catalogue-only. If production components need semantic domain data, define that data in the owning component or `lib`, not in catalogue fixtures.

- [ ] **Step 3: Make each example a thin production consumer**

For each current preview, rename to `*-example.tsx` and replace embedded production patterns with root-barrel components. The required pattern is:

```tsx
import { ArchivedBanner } from "@/components/shared/design-system";

export function ArchivedBannerExample() {
  return (
    <ArchivedBanner
      title="Data diarsipkan"
      description="Data tetap tersedia dalam riwayat."
    />
  );
}
```

Apply the same rule to progress, version timeline, mitigation form/dialog, table, pagination, tabs, search, filter, form container, action buttons, report components, risk summary, and overview components. Examples may hold demo-only `useState`, but production components receive controlled props and callbacks.

- [ ] **Step 4: Update the catalogue page import boundary**

Replace the page import with:

```ts
import {
  AccordionExample,
  ActionButtonsExample,
  ArchivedBannerExample,
  ColorPaletteExample,
  CollectionLayoutExample,
  DesignSystemSectionLabel,
  TypographyExample,
} from "@/components/shared/design-system/examples";
```

Include every export listed in `examples/index.ts` that the page renders and rename JSX from `Preview` to `Example`. `ColorPaletteExample` owns the existing swatch grid, and `OverviewDashboardExample` owns the current KPI/overview fixture rendering. Do not change section order, headings, wrappers, spacing, or fixture values.

- [ ] **Step 5: Remove old flat catalogue files and verify boundaries**

Run:

```bash
rg -n 'Preview|design-system/(data|.*-preview)' frontend/src
cd frontend
node --test --experimental-specifier-resolution=node src/components/design-system-architecture.test.ts
```

Expected: `rg` returns no production imports and no old preview modules; architecture tests PASS unless a remaining production deep import is identified by filename.

- [ ] **Step 6: Commit**

```bash
git add 'frontend/src/app/(app)/design-system/page.tsx' \
  frontend/src/components/shared/design-system/examples \
  frontend/src/components/shared/design-system/data \
  frontend/src/components/design-system-architecture.test.ts
git add -p frontend/src/components/shared/design-system
git diff --cached --name-only
git commit -m "refactor: make design system catalogue consume reusable components"
```

---

### Task 6: Migrate Every Production Consumer to the Root Barrel

**Files:**
- Modify: every `.ts`/`.tsx` file reported by the searches below
- Modify: `frontend/src/components/design-system-architecture.test.ts`
- Modify: existing contract tests whose source paths changed

- [ ] **Step 1: Generate the remaining violation list**

Run:

```bash
rg -n '@/components/shared/collection-primitives|@/components/shared/design-system/' frontend/src \
  --glob '*.ts' --glob '*.tsx'
rg -n '@/components/shared/(card-patterns|report-primitives|risk-assessment-summary-strip)' frontend/src \
  --glob '*.ts' --glob '*.tsx'
```

Expected: the first command may report internal examples and tests only; the second must report no production consumer.

- [ ] **Step 2: Normalize production imports**

Every production consumer outside the Design System must use one import declaration:

```ts
import {
  ActionButton,
  CollectionPagination,
  CollectionTableCard,
  PageStack,
} from "@/components/shared/design-system";
```

The symbol list varies by consumer. Merge duplicate imports and sort names. Do not alter component props or page logic.

- [ ] **Step 3: Enforce the internal dependency direction**

Inside `design-system/actions`, `collections`, `feedback`, `layout`, `reports`, and `domain`, use relative imports for sibling production components:

```ts
import { ActionButton } from "../actions/action-button";
```

Do not import the root barrel from production internals. This avoids circular module initialization. Examples are the only internal folder allowed to consume the public root barrel.

- [ ] **Step 4: Run all source contract tests**

```bash
cd frontend
npm test
```

Expected: all Node tests PASS. If a test reads an old file path, update only the fixture path; preserve its behavior assertion.

- [ ] **Step 5: Commit consumer migration**

Stage only files listed by the searches in Step 1 plus contract tests:

```bash
git add frontend/src/components/design-system-architecture.test.ts \
  frontend/src/components/shared-page-contracts.test.ts \
  frontend/src/components/shared-management-report-page-contracts.test.ts
git add -p frontend/src/app frontend/src/components
git diff --cached --name-only
git commit -m "refactor: use canonical design system imports"
```

During interactive staging, accept only root-barrel import normalization and test-path hunks. Reject all unrelated pre-existing changes.

---

### Task 7: Strengthen Behavior Tests for Interactive Components

**Files:**
- Create: `frontend/src/components/shared/design-system/collections/collection-pagination.test.ts`
- Create: `frontend/src/components/shared/design-system/collections/collection-pagination-items.ts`
- Create: `frontend/src/components/shared/design-system/collections/expandable-search-field.test.ts`
- Modify: production files only if a test exposes a behavior regression

The repository's current tests are source-contract tests, not DOM tests. Preserve that convention in this refactor rather than adding an unapproved testing dependency.

- [ ] **Step 1: Extract and test pagination calculation**

Export a pure internal helper from `collection-pagination-items.ts` and import it from `collection-pagination.tsx`:

```ts
export function paginationItems(page: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}
```

Test exact boundaries:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { paginationItems } from "./collection-pagination-items";

test("pagination keeps a stable five-page window", () => {
  assert.deepEqual(paginationItems(1, 8), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginationItems(4, 8), [2, 3, 4, 5, 6]);
  assert.deepEqual(paginationItems(8, 8), [4, 5, 6, 7, 8]);
  assert.deepEqual(paginationItems(2, 3), [1, 2, 3]);
});
```

- [ ] **Step 2: Add controlled-search source contracts**

Read `expandable-search-field.tsx` and assert the preserved interactions:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./expandable-search-field.tsx", import.meta.url),
  "utf8",
);

test("expandable search preserves controlled and keyboard behavior", () => {
  assert.match(source, /onChange\(event\.target\.value\)/);
  assert.match(source, /if \(!value\) setOpen\(false\)/);
  assert.match(source, /e\.key === "Escape"/);
  assert.match(source, /autoFocus/);
  assert.match(source, /aria-label=\{ariaLabel\}/);
});
```

- [ ] **Step 3: Run and commit focused tests**

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/components/shared/design-system/collections/collection-pagination.test.ts \
  src/components/shared/design-system/collections/expandable-search-field.test.ts
```

Expected: PASS.

```bash
git add frontend/src/components/shared/design-system/collections/collection-pagination.tsx \
  frontend/src/components/shared/design-system/collections/collection-pagination-items.ts \
  frontend/src/components/shared/design-system/collections/collection-pagination.test.ts \
  frontend/src/components/shared/design-system/collections/expandable-search-field.test.ts
git commit -m "test: cover design system collection behavior"
```

---

### Task 8: Synchronize DESIGN.md and Catalogue Contracts

**Files:**
- Modify: `DESIGN.md`
- Modify: `frontend/src/components/shared-page-contracts.test.ts`

- [ ] **Step 1: Write the failing documentation assertions**

Add:

```ts
test("the design system documents its canonical component ownership", () => {
  assert.match(designSystemDocument, /@\/components\/shared\/design-system/);
  assert.match(designSystemDocument, /examples.*fixture/i);
  assert.match(designSystemDocument, /must not deep-import/i);
  assert.match(designSystemDocument, /collection-primitives\.tsx.*removed/i);
});
```

- [ ] **Step 2: Add the approved ownership rules to DESIGN.md**

Add a concise “Component Ownership and Imports” subsection under Operational Summaries containing these normative statements:

```markdown
- `frontend/src/components/shared/design-system` is the canonical home for composed reusable Manris components.
- Production consumers import composed components only from `@/components/shared/design-system` and must not deep-import category folders.
- `components/ui` remains the low-level shadcn foundation.
- Catalogue examples live under `design-system/examples`, use fixture data, and render production components instead of duplicating their structural classes or behavior.
- The former `components/shared/collection-primitives.tsx` module is removed; its focused components live under the internal `collections` category and are exported through the root Design System API.
- Domain-aware components may remain in the Design System when they receive data and callbacks through props and own no fetching, routing, permission, or page business state.
```

- [ ] **Step 3: Run the documentation contract**

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/shared-page-contracts.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit documentation synchronization**

```bash
git add -p DESIGN.md frontend/src/components/shared-page-contracts.test.ts
git diff --cached --name-only
git commit -m "docs: synchronize reusable design system contracts"
```

---

### Task 9: Final Verification and Dead-Code Audit

**Files:**
- Modify only files required to resolve failures introduced by this refactor

- [ ] **Step 1: Verify no stale paths remain**

Run:

```bash
test ! -e frontend/src/components/shared/collection-primitives.tsx
rg -n '@/components/shared/collection-primitives|@/components/shared/design-system/' frontend/src \
  --glob '*.ts' --glob '*.tsx'
rg -n 'Preview' frontend/src/components/shared/design-system/index.ts
```

Expected:

- `test` exits 0.
- Deep Design System imports appear only in `examples/` if required by the catalogue boundary; production files report none.
- The production barrel contains no `Preview` export.

- [ ] **Step 2: Run the complete test suite**

```bash
cd frontend
npm test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 3: Run lint**

```bash
cd frontend
npm run lint
```

Expected: exit 0. Fix only warnings/errors caused by changed files; report unrelated pre-existing failures without modifying unrelated code.

- [ ] **Step 4: Run the production build**

```bash
cd frontend
npm run build
```

Expected: Next.js production build exits 0 with no TypeScript error or missing export.

- [ ] **Step 5: Perform representative UI QA**

Run the dev server:

```bash
cd frontend
npm run dev
```

Inspect `/design-system` and representative routes for risk register, monitoring, reports, overview, management, inbox, and admin at desktop and narrow widths. Compare section order, typography, spacing, borders, tables, pagination, dialog behavior, loading/error/empty states, keyboard focus, and local horizontal overflow with the pre-refactor behavior.

- [ ] **Step 6: Review the final diff scope**

```bash
git status --short
git diff --stat HEAD~8..HEAD
git log --oneline -10
```

Expected: only Design System architecture, import migrations, tests, and `DESIGN.md` synchronization are part of this work. Existing unrelated user modifications remain unstaged and unaltered.

- [ ] **Step 7: Commit any final refactor-only corrections**

If verification required corrections:

```bash
git add -p frontend/src/components/shared/design-system frontend/src/components \
  frontend/src/app DESIGN.md
git diff --cached --name-only
git commit -m "fix: complete design system migration"
```

If no correction was needed, do not create an empty commit.

---

## Completion Checklist

- [ ] Old collection monolith deleted with no compatibility shim.
- [ ] One public component per focused file.
- [ ] Production consumers use only the root Design System barrel.
- [ ] Internal production modules avoid root-barrel cycles.
- [ ] Examples use production components with fixtures.
- [ ] Catalogue-only modules are absent from the production barrel.
- [ ] Domain components contain no page-owned business behavior.
- [ ] `/design-system` and representative feature pages retain current visuals and behavior.
- [ ] `DESIGN.md` matches the implemented ownership contract.
- [ ] Tests, lint, and production build pass.
