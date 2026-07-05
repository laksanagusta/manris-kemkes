# Tailwind Component Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Tailwind-native geometry contract to all shared UI primitives and document it in `DESIGN.md`.

**Architecture:** Existing primitives inherit the new default geometry so current consumers update automatically. Missing concepts are introduced as small geometry-only primitives, while source-level contract tests prevent future drift without requiring a browser DOM.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, class-variance-authority, Node test runner, Google design.md

---

## File Structure

- Create `frontend/src/components/ui/component-geometry.test.ts`: regression
  contract for all required Tailwind class combinations.
- Modify `frontend/src/components/ui/button.tsx`: primary, premium, and icon
  dimensions.
- Modify `frontend/src/components/ui/input.tsx`: default input geometry.
- Create `frontend/src/components/ui/search-input.tsx`: search-specific input.
- Modify `frontend/src/components/ui/card.tsx`: default and large cards.
- Create `frontend/src/components/ui/list-group.tsx`: clipped list container.
- Create `frontend/src/components/ui/icon-tile.tsx`: regular and app icon tiles.
- Modify `frontend/src/components/ui/tabs.tsx`: segmented control geometry.
- Modify `frontend/src/components/ui/dialog.tsx`: modal geometry.
- Modify `frontend/src/components/ui/sheet.tsx`: bottom-sheet geometry.
- Modify `frontend/src/components/ui/badge.tsx`: chip geometry.
- Modify `frontend/src/components/ui/sonner.tsx`: toast geometry.
- Modify `frontend/src/components/ui/popover.tsx`: popover geometry.
- Modify `frontend/src/components/ui/dropdown-menu.tsx`: dropdown geometry.
- Modify `DESIGN.md`: normative tokens and component guidance.

### Task 1: Lock the Geometry Contract

**Files:**
- Create: `frontend/src/components/ui/component-geometry.test.ts`

- [ ] **Step 1: Add the failing source contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

const contracts: Array<[string, string[]]> = [
  ["button.tsx", ["h-11", "rounded-xl", "px-5", "premium", "h-12", "rounded-2xl", "px-6", "size-10 rounded-full", "size-11 rounded-full"]],
  ["input.tsx", ["h-11", "rounded-xl", "px-3"]],
  ["search-input.tsx", ["h-11", "rounded-2xl", "px-4"]],
  ["card.tsx", ["rounded-2xl", "p-4", "size?: \"default\" | \"sm\" | \"lg\"", "data-[size=lg]:rounded-3xl", "data-[size=lg]:p-6"]],
  ["list-group.tsx", ["rounded-2xl", "overflow-hidden"]],
  ["icon-tile.tsx", ["size-11", "rounded-2xl", "size-14", "rounded-3xl"]],
  ["tabs.tsx", ["rounded-xl", "p-1"]],
  ["dialog.tsx", ["rounded-3xl", "p-6", "-mx-6", "-mb-6"]],
  ["sheet.tsx", ["data-[side=bottom]:rounded-t-3xl", "data-[side=bottom]:p-5"]],
  ["badge.tsx", ["h-8", "rounded-full", "px-3"]],
  ["sonner.tsx", ["rounded-2xl", "px-4", "py-3"]],
  ["popover.tsx", ["rounded-3xl"]],
  ["dropdown-menu.tsx", ["rounded-2xl"]],
];

for (const [file, classes] of contracts) {
  test(`${file} follows the shared geometry contract`, () => {
    const contents = source(file);
    for (const className of classes) {
      assert.ok(contents.includes(className), `${file} must include ${className}`);
    }
  });
}
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
cd frontend
node --test src/components/ui/component-geometry.test.ts
```

Expected: FAIL because existing primitives use compact legacy geometry and the
three new primitives do not exist.

### Task 2: Update Core Controls and Surfaces

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ui/input.tsx`
- Modify: `frontend/src/components/ui/card.tsx`
- Modify: `frontend/src/components/ui/tabs.tsx`
- Modify: `frontend/src/components/ui/badge.tsx`

- [ ] **Step 1: Update button sizes**

Use these CVA size values:

```ts
default:
  "h-11 gap-2 rounded-xl px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
premium:
  "h-12 gap-2 rounded-2xl px-6 text-sm has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
xs: "h-7 gap-1.5 rounded-lg px-2.5 text-[11px]",
sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
lg: "h-11 gap-2 rounded-xl px-5 text-sm",
icon: "size-10 rounded-full",
"icon-xs": "size-8 rounded-full",
"icon-sm": "size-10 rounded-full",
"icon-lg": "size-11 rounded-full",
```

Remove the base `rounded-[12px]` so each size owns its geometry.

- [ ] **Step 2: Update input**

Replace the leading geometry in the base class with:

```ts
"h-11 w-full min-w-0 rounded-xl border border-input bg-transparent px-3 py-1"
```

- [ ] **Step 3: Update card size API**

Change the size type and base geometry to:

```tsx
}: React.ComponentProps<"div"> & { size?: "default" | "sm" | "lg" }) {
```

```ts
"group/card flex flex-col gap-4 overflow-hidden rounded-2xl bg-card p-4 text-sm text-card-foreground ... data-[size=sm]:gap-3 data-[size=sm]:p-3 data-[size=lg]:gap-6 data-[size=lg]:rounded-3xl data-[size=lg]:p-6"
```

Remove duplicated vertical padding from the existing base class. Keep header,
content, and footer internal padding behavior intact for compatibility.

- [ ] **Step 4: Update segmented control and chip**

Use:

```ts
// tabsListVariants
"group/tabs-list inline-flex w-fit items-center justify-center rounded-xl p-1 ..."

// badgeVariants
"group/badge inline-flex h-8 ... rounded-full border px-3 py-0 ..."
```

- [ ] **Step 5: Run the contract test**

Run:

```bash
cd frontend
node --test src/components/ui/component-geometry.test.ts
```

Expected: still FAIL only for overlay and missing primitive contracts.

### Task 3: Add Missing Geometry Primitives

**Files:**
- Create: `frontend/src/components/ui/search-input.tsx`
- Create: `frontend/src/components/ui/list-group.tsx`
- Create: `frontend/src/components/ui/icon-tile.tsx`

- [ ] **Step 1: Add SearchInput**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function SearchInput({
  className,
  type = "search",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="search-input"
      className={cn(
        "h-11 w-full min-w-0 rounded-2xl border border-input bg-transparent px-4 py-1 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { SearchInput };
```

- [ ] **Step 2: Add ListGroup**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function ListGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-group"
      className={cn("overflow-hidden rounded-2xl", className)}
      {...props}
    />
  );
}

export { ListGroup };
```

- [ ] **Step 3: Add IconTile**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconTileVariants = cva(
  "inline-flex shrink-0 items-center justify-center",
  {
    variants: {
      size: {
        default: "size-11 rounded-2xl",
        app: "size-14 rounded-3xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function IconTile({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof iconTileVariants>) {
  return (
    <div
      data-slot="icon-tile"
      data-size={size}
      className={cn(iconTileVariants({ size }), className)}
      {...props}
    />
  );
}

export { IconTile, iconTileVariants };
```

- [ ] **Step 4: Run the contract test**

Run:

```bash
cd frontend
node --test src/components/ui/component-geometry.test.ts
```

Expected: new primitive tests PASS; overlay tests remain failing.

### Task 4: Update Overlay Geometry

**Files:**
- Modify: `frontend/src/components/ui/dialog.tsx`
- Modify: `frontend/src/components/ui/sheet.tsx`
- Modify: `frontend/src/components/ui/sonner.tsx`
- Modify: `frontend/src/components/ui/popover.tsx`
- Modify: `frontend/src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Update modal and footer**

Change `DialogContent` geometry to:

```ts
"... gap-4 rounded-3xl bg-background p-6 ..."
```

Change `DialogFooter` edge offsets and radius to:

```ts
"-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-3xl border-t bg-muted/50 p-6 ..."
```

- [ ] **Step 2: Update bottom sheet only**

Add these orientation classes to the `SheetContent` base string:

```ts
"data-[side=bottom]:rounded-t-3xl data-[side=bottom]:p-5"
```

Do not apply radius to right or left sheets.

- [ ] **Step 3: Update transient overlays**

Use:

```ts
// Sonner toast class
"cn-toast rounded-2xl border px-4 py-3 shadow-lg ..."

// PopoverContent
"... rounded-3xl ..."

// DropdownMenuContent and DropdownMenuSubContent
"... rounded-2xl ..."
```

- [ ] **Step 4: Verify all contract tests pass**

Run:

```bash
cd frontend
node --test src/components/ui/component-geometry.test.ts
```

Expected: 13 tests PASS.

### Task 5: Synchronize DESIGN.md

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Update front matter**

Set the radius scale and add geometry component entries:

```yaml
rounded:
  full: "9999px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    height: "44px"
    padding: "0 20px"
  button-premium:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.2xl}"
    height: "48px"
    padding: "0 24px"
  input-default:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "44px"
    padding: "0 12px"
  search-input:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    height: "44px"
    padding: "0 16px"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  card-large:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  chip-default:
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 12px"
```

Preserve existing state entries and colors; update their geometry references
instead of deleting them.

- [ ] **Step 2: Update prose and canonical section order**

Ensure headings appear exactly once in this order:

```md
## Overview
## Colors
## Typography
## Layout
## Elevation & Depth
## Shapes
## Components
## Do's and Don'ts
```

Document every approved geometry contract in `## Shapes` and `## Components`.
State explicitly: “The system uses Tailwind-native circular border radii.
Corner smoothing is 0%; do not describe these shapes as Apple/Figma
squircles.”

- [ ] **Step 3: Validate DESIGN.md**

Run:

```bash
npx @google/design.md lint DESIGN.md
```

Expected: lint exits successfully. If registry access is unavailable, manually
verify YAML delimiters, token references, unique canonical headings, and
contrast-sensitive component entries.

### Task 6: Verify the Application

**Files:**
- Verify all files changed above.

- [ ] **Step 1: Run focused lint**

Run:

```bash
cd frontend
npx eslint src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/search-input.tsx src/components/ui/card.tsx src/components/ui/list-group.tsx src/components/ui/icon-tile.tsx src/components/ui/tabs.tsx src/components/ui/dialog.tsx src/components/ui/sheet.tsx src/components/ui/badge.tsx src/components/ui/sonner.tsx src/components/ui/popover.tsx src/components/ui/dropdown-menu.tsx src/components/ui/component-geometry.test.ts
```

Expected: 0 errors.

- [ ] **Step 2: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 3: Review the scoped diff**

Run:

```bash
git diff --check -- DESIGN.md frontend/src/components/ui
git diff --stat -- DESIGN.md frontend/src/components/ui
```

Expected: no whitespace errors and changes remain limited to the approved
design-system files.

