# Reports Filter Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-visible scope filter on `/reports` with a right-side Sheet that edits vertical Group and Unit fields as draft state and only refreshes the report after `Terapkan Filter`.

**Architecture:** Keep applied report scope state in `reports/page.tsx`, introduce a separate draft scope state for the open Sheet, and isolate reset/copy rules in a pure helper with node tests. Extend the shared `ReportScopePicker` with optional controlled unit IDs and a vertical layout while preserving its current default behavior for all other consumers. Render the Sheet through a focused page-local component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn/ui Sheet/Button/Badge/Separator, existing report scope pickers, Node test runner, ESLint, Tailwind CSS v4.

---

## File Structure

- Create `frontend/src/lib/reports-filter-sheet.ts`
  - Defines the draft/applied scope shape and pure copy/reset helpers.
- Create `frontend/src/lib/reports-filter-sheet.test.ts`
  - Covers global reset, non-global reset, invalid default organization, and copy isolation.
- Modify `frontend/src/components/report/report-scope-picker.tsx`
  - Adds optional controlled unit IDs and `orientation="vertical"` without changing default consumers.
- Create `frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx`
  - Owns the Filter trigger, active-unit badge, right Sheet composition, vertical picker, and footer actions.
- Modify `frontend/src/app/(app)/reports/page.tsx`
  - Owns applied state, draft state, Sheet open/cancel/reset/apply behavior, and removes the always-visible filter Card.

### Task 1: Add Pure Draft And Reset Rules

**Files:**
- Create: `frontend/src/lib/reports-filter-sheet.ts`
- Create: `frontend/src/lib/reports-filter-sheet.test.ts`

- [ ] **Step 1: Write failing tests for copy and reset behavior**

Create `frontend/src/lib/reports-filter-sheet.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/reports-filter-sheet.test.ts
```

Expected: FAIL because `reports-filter-sheet.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

Create `frontend/src/lib/reports-filter-sheet.ts`:

```ts
export type ReportsFilterScope = {
  organizationId: string;
  organizationGroupId: string;
  organizationIds: string[];
};

type ReportsFilterUser = {
  isGlobal: boolean;
  organizationId: string | null;
};

type ReportsFilterOrganization = {
  id: string;
};

export function copyReportsFilterScope(
  scope: ReportsFilterScope,
): ReportsFilterScope {
  return {
    ...scope,
    organizationIds: [...scope.organizationIds],
  };
}

export function resolveDefaultReportsFilterScope(
  user: ReportsFilterUser | null | undefined,
  organizations: ReportsFilterOrganization[],
): ReportsFilterScope {
  const defaultOrganizationId =
    !user?.isGlobal &&
    user?.organizationId &&
    organizations.some((organization) => organization.id === user.organizationId)
      ? user.organizationId
      : "";

  return {
    organizationId: defaultOrganizationId,
    organizationGroupId: "",
    organizationIds: defaultOrganizationId ? [defaultOrganizationId] : [],
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/reports-filter-sheet.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add frontend/src/lib/reports-filter-sheet.ts frontend/src/lib/reports-filter-sheet.test.ts
git commit -m "test: define reports filter sheet state"
```

### Task 2: Make ReportScopePicker Controlled And Vertically Composable

**Files:**
- Modify: `frontend/src/components/report/report-scope-picker.tsx`

- [ ] **Step 1: Add the new optional props**

Extend `ReportScopePickerProps`:

```ts
interface ReportScopePickerProps {
  // Existing props remain unchanged.
  selectedOrganizationIds?: string[];
  orientation?: "inline" | "vertical";
}
```

Default `orientation` to `"inline"` in the component arguments. Treat
`selectedOrganizationIds !== undefined` as controlled mode.

- [ ] **Step 2: Preserve existing uncontrolled behavior and support controlled unit IDs**

Replace the final `selectedUnitIds` resolution with:

```ts
const fallbackSelectedUnitIds = useMemo(
  () =>
    selectedUnitSelection.groupId === organizationGroupId
      ? selectedUnitSelection.unitIds
      : hasRealGroup
        ? selectedGroupMemberIds
        : organizationId && organizationId !== allOrganizationValue
          ? [organizationId]
          : [],
  [
    allOrganizationValue,
    hasRealGroup,
    organizationGroupId,
    organizationId,
    selectedGroupMemberIds,
    selectedUnitSelection,
  ],
);

const selectedUnitIds =
  selectedOrganizationIds === undefined
    ? fallbackSelectedUnitIds
    : selectedOrganizationIds;
```

When group or unit selection changes:

- Continue updating `selectedUnitSelection` for uncontrolled consumers.
- Call `onSelectedOrganizationIdsChange` directly only in controlled mode.
- Let the existing effect propagate `selectedUnitIds` for uncontrolled
  consumers so they do not receive duplicate callbacks.
- Do not call `onSelectedOrganizationIdsChange` from an effect in controlled
  mode.

Replace the existing callback effect with:

```ts
useEffect(() => {
  if (selectedOrganizationIds !== undefined) {
    return;
  }

  onSelectedOrganizationIdsChange?.(selectedUnitIds);
}, [
  onSelectedOrganizationIdsChange,
  selectedOrganizationIds,
  selectedUnitIds,
]);
```

Use this group-change sequence:

```ts
const nextUnitIds = nextGroup?.members?.map((member) => member.id) ?? [];
setSelectedUnitSelection({ groupId, unitIds: nextUnitIds });
onOrganizationGroupChange(groupId);
onOrganizationChange(allOrganizationValue ?? "");
if (selectedOrganizationIds !== undefined) {
  onSelectedOrganizationIdsChange?.(nextUnitIds);
}
```

Use this unit-change sequence:

```ts
setSelectedUnitSelection({
  groupId: organizationGroupId,
  unitIds,
});
if (selectedOrganizationIds !== undefined) {
  onSelectedOrganizationIdsChange?.(unitIds);
}

if (!hasRealGroup) {
  onOrganizationChange(unitIds.length === 1 ? unitIds[0] : "");
  onOrganizationGroupChange(allOrganizationGroupValue ?? "");
}
```

- [ ] **Step 3: Add vertical layout without changing the default**

Import `cn` if it is not already imported and replace the fixed grid class:

```tsx
<div
  className={cn(
    "grid gap-3",
    orientation === "vertical"
      ? "grid-cols-1"
      : "md:grid-cols-[0.95fr_1.15fr] md:items-start",
  )}
>
```

Keep all field labels, group badge, debounce behavior, and multi-select unit
combobox unchanged.

- [ ] **Step 4: Run focused lint and TypeScript checks**

Run:

```bash
cd frontend
npm run lint -- src/components/report/report-scope-picker.tsx
npm -s exec tsc -p tsconfig.json --noEmit
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit the controlled vertical picker support**

```bash
git add frontend/src/components/report/report-scope-picker.tsx
git commit -m "feat: support vertical controlled report scope"
```

### Task 3: Build The Page-Local Filter Sheet

**Files:**
- Create: `frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx`

- [ ] **Step 1: Create the controlled Sheet component**

Create `frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx`
with this public interface:

```ts
import type { Dispatch, SetStateAction } from "react";

type ReportsFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeUnitCount: number;
  disabled: boolean;
  draftScope: ReportsFilterScope;
  onDraftScopeChange: Dispatch<SetStateAction<ReportsFilterScope>>;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
};
```

Use these imports:

```ts
"use client";

import type { Dispatch, SetStateAction } from "react";
import { FilterIcon } from "lucide-react";

import { ReportScopePicker } from "@/components/report/report-scope-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
```

- [ ] **Step 2: Compose the trigger and right-side Sheet**

Export the component and render the trigger with built-in shadcn variants:

```tsx
export function ReportsFilterSheet({
  open,
  onOpenChange,
  activeUnitCount,
  disabled,
  draftScope,
  onDraftScopeChange,
  organizations,
  organizationGroups,
  onReset,
  onCancel,
  onApply,
}: ReportsFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <FilterIcon data-icon="inline-start" />
          Filter
          <Badge variant="secondary">{activeUnitCount} unit</Badge>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Filter Laporan</SheetTitle>
          <SheetDescription>
            Atur group dan unit. Perubahan baru diterapkan setelah Anda menekan
            Terapkan Filter.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <ReportScopePicker
            organizationId={draftScope.organizationId}
            onOrganizationChange={(organizationId) =>
              onDraftScopeChange((current) => ({
                ...current,
                organizationId,
              }))
            }
            selectedOrganizationIds={draftScope.organizationIds}
            onSelectedOrganizationIdsChange={(organizationIds) =>
              onDraftScopeChange((current) => ({
                ...current,
                organizationIds,
              }))
            }
            organizations={organizations}
            organizationGroupId={draftScope.organizationGroupId}
            onOrganizationGroupChange={(organizationGroupId) =>
              onDraftScopeChange((current) => ({
                ...current,
                organizationGroupId,
              }))
            }
            organizationGroups={organizationGroups}
            organizationPlaceholder="Pilih unit"
            organizationGroupPlaceholder="Pilih grup"
            orientation="vertical"
          />
        </div>

        <Separator />

        <SheetFooter className="sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onReset}>
            Reset
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button type="button" onClick={onApply}>
              Terapkan Filter
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

Use `gap-*` layout classes only. Keep `SheetTitle` visible for accessibility.
The functional draft updates are required because `ReportScopePicker` can emit
group, organization, and selected-unit callbacks synchronously during one
interaction.

- [ ] **Step 3: Run focused lint and TypeScript checks**

Run:

```bash
cd frontend
npm run lint -- 'src/app/(app)/reports/_components/report-filter-sheet.tsx'
npm -s exec tsc -p tsconfig.json --noEmit
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit the Sheet component**

```bash
git add 'frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx'
git commit -m "feat: add reports filter sheet"
```

### Task 4: Integrate Draft And Applied Filter State Into Reports Page

**Files:**
- Modify: `frontend/src/app/(app)/reports/page.tsx`

- [ ] **Step 1: Add imports and state**

Import:

```ts
import { useEffect, useMemo, useRef, useState } from "react";

import { ReportsFilterSheet } from "./_components/report-filter-sheet";
import {
  copyReportsFilterScope,
  resolveDefaultReportsFilterScope,
  type ReportsFilterScope,
} from "@/lib/reports-filter-sheet";
```

Remove the existing fragmented applied state:

```ts
const [reportOrgId, setReportOrgId] = useState("");
const [reportGroupId, setReportGroupId] = useState("");
const [reportOrgIds, setReportOrgIds] = useState<string[]>([]);
```

Replace it with one applied scope object, aliases used by the existing report
query code, a draft scope, and a token initialization guard:

```ts
const EMPTY_REPORT_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};
```

Define `EMPTY_REPORT_SCOPE` at module scope, below the existing top-level
constants. Inside `ReportsPage`, replace the fragmented applied state with:

```ts
const [appliedReportScope, setAppliedReportScope] =
  useState<ReportsFilterScope>(() =>
    copyReportsFilterScope(EMPTY_REPORT_SCOPE),
  );
const [reportFilterOpen, setReportFilterOpen] = useState(false);
const [draftReportScope, setDraftReportScope] =
  useState<ReportsFilterScope>(() =>
    copyReportsFilterScope(EMPTY_REPORT_SCOPE),
  );
const reportScopeInitializedForTokenRef = useRef<string | null>(null);

const reportOrgId = appliedReportScope.organizationId;
const reportGroupId = appliedReportScope.organizationGroupId;
const reportOrgIds = appliedReportScope.organizationIds;
```

- [ ] **Step 2: Replace the old synchronization effects with one-time default initialization**

Delete:

```ts
const hasSelectedReportGroup = reportGroupId && reportGroupId !== "all";
```

Delete the effect that derives `reportOrgIds` from `reportOrgId`. It would
erase a valid multi-unit selection when no group is selected:

```ts
useEffect(() => {
  if (hasSelectedReportGroup) {
    return;
  }

  if (reportOrgId) {
    setReportOrgIds([reportOrgId]);
    return;
  }

  setReportOrgIds([]);
}, [hasSelectedReportGroup, reportOrgId]);
```

Delete the existing default-organization effect that calls
`resolveDefaultReportOrgId`, and remove `resolveDefaultReportOrgId` from the
imports. Remove the page-level `ReportScopePicker` import as well because only
the new Sheet component will render it. Replace the default-organization effect
with:

```ts
useEffect(() => {
  if (
    !token ||
    reportScopeInitializedForTokenRef.current === token ||
    reportOrganizations.length === 0
  ) {
    return;
  }

  const defaultScope = resolveDefaultReportsFilterScope(
    user,
    reportOrganizations,
  );
  setAppliedReportScope(defaultScope);
  setDraftReportScope(copyReportsFilterScope(defaultScope));
  reportScopeInitializedForTokenRef.current = token;
}, [reportOrganizations, token, user]);
```

In the existing `if (!token)` branch that clears organization options, replace
the removed fragmented-state calls:

```ts
setReportOrgId("");
setReportGroupId("");
```

with resets for both scope states and the guard:

```ts
setAppliedReportScope(copyReportsFilterScope(EMPTY_REPORT_SCOPE));
setDraftReportScope(copyReportsFilterScope(EMPTY_REPORT_SCOPE));
reportScopeInitializedForTokenRef.current = null;
```

- [ ] **Step 3: Add Sheet action helpers**

Add:

```ts
const handleReportFilterOpenChange = (open: boolean) => {
  setReportFilterOpen(open);
  if (open) {
    setDraftReportScope(copyReportsFilterScope(appliedReportScope));
  }
};

const handleCancelReportFilter = () => {
  setDraftReportScope(copyReportsFilterScope(appliedReportScope));
  setReportFilterOpen(false);
};

const handleResetReportFilter = () => {
  setDraftReportScope(
    resolveDefaultReportsFilterScope(user, reportOrganizations),
  );
};

const handleApplyReportFilter = () => {
  setAppliedReportScope(copyReportsFilterScope(draftReportScope));
  setReportFilterOpen(false);
};
```

The close button and overlay must use `handleReportFilterOpenChange(false)` so
closing without apply never changes the applied state.

- [ ] **Step 4: Remove draft-triggered query changes**

Confirm that all query-building values remain based only on applied state:

```ts
const reportScopeQuery = reportOrgIds.length
  ? `&org_id=${encodeURIComponent(reportOrgIds.join(","))}`
  : "";

const requiresReportScopeSelection =
  requiresReportOrgSelection && reportOrgIds.length === 0;
```

Do not add `draftReportScope` or `reportFilterOpen` to report-fetch effect
dependencies.

- [ ] **Step 5: Replace the always-visible filter Card**

Delete the Card that currently wraps `ReportScopePicker` and its explanatory
text. Render the page-local Sheet trigger directly below the page header:

```tsx
<ReportsFilterSheet
  open={reportFilterOpen}
  onOpenChange={handleReportFilterOpenChange}
  activeUnitCount={reportOrgIds.length}
  disabled={
    reportOrganizations.length === 0 && reportOrganizationGroups.length === 0
  }
  draftScope={draftReportScope}
  onDraftScopeChange={setDraftReportScope}
  organizations={reportOrganizations}
  organizationGroups={reportOrganizationGroups}
  onReset={handleResetReportFilter}
  onCancel={handleCancelReportFilter}
  onApply={handleApplyReportFilter}
/>
```

Keep export cards, charts, and all report data sections unchanged.

- [ ] **Step 6: Verify draft changes do not trigger report requests**

Run the frontend development server:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000/reports` in the in-app browser with an authenticated
session and verify:

1. Initial page shows only the `Filter` button and active-unit badge.
2. Opening the Sheet does not trigger report requests.
3. Changing Group or Unit inside the Sheet does not trigger report requests.
4. `Batal` closes the Sheet and preserves the badge and report data.
5. Reopening the Sheet restores the applied selection.
6. `Reset` changes only the draft until `Terapkan Filter` is clicked.
7. `Terapkan Filter` closes the Sheet, updates the badge, and triggers one
   applied-scope report refresh cycle.
8. Group and Unit remain vertically stacked on desktop and mobile widths.
9. Closing through the built-in close button or overlay behaves like cancel
   when the Sheet is reopened.

- [ ] **Step 7: Run focused lint and TypeScript checks**

Run:

```bash
cd frontend
npm run lint -- \
  'src/app/(app)/reports/page.tsx' \
  'src/app/(app)/reports/_components/report-filter-sheet.tsx' \
  src/components/report/report-scope-picker.tsx \
  src/lib/reports-filter-sheet.ts \
  src/lib/reports-filter-sheet.test.ts
npm -s exec tsc -p tsconfig.json --noEmit
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit the page integration**

```bash
git add \
  'frontend/src/app/(app)/reports/page.tsx' \
  'frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx' \
  frontend/src/components/report/report-scope-picker.tsx
git commit -m "feat: move reports filters into sheet"
```

### Task 5: Full Frontend Verification

**Files:**
- Verify only; no planned edits.

- [ ] **Step 1: Run the focused helper test**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/reports-filter-sheet.test.ts
```

Expected: all reports filter sheet helper tests PASS.

- [ ] **Step 2: Run the full frontend test suite**

Run:

```bash
cd frontend
npm test
```

Expected: all frontend node tests PASS.

- [ ] **Step 3: Run frontend lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: exit 0. Existing unrelated warnings must be recorded rather than
silently ignored.

- [ ] **Step 4: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git diff -- \
  frontend/src/lib/reports-filter-sheet.ts \
  frontend/src/lib/reports-filter-sheet.test.ts \
  frontend/src/components/report/report-scope-picker.tsx \
  'frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx' \
  'frontend/src/app/(app)/reports/page.tsx'
```

Expected: no whitespace errors, no unrelated changes, and no changes to other
report pages.

- [ ] **Step 6: Commit verification-driven fixes if needed**

If verification required fixes, stage only the files listed above and commit:

```bash
git add \
  frontend/src/lib/reports-filter-sheet.ts \
  frontend/src/lib/reports-filter-sheet.test.ts \
  frontend/src/components/report/report-scope-picker.tsx \
  'frontend/src/app/(app)/reports/_components/report-filter-sheet.tsx' \
  'frontend/src/app/(app)/reports/page.tsx'
git commit -m "fix: finalize reports filter sheet"
```
