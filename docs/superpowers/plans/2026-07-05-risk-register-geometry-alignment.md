# Risk Register Geometry Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove accidental local geometry overrides from `/risk/register` while preserving documented compact table controls.

**Architecture:** A source-level contract test distinguishes primary interface geometry from deliberate dense exceptions. The page then adopts `SearchInput`, shared button geometry, 44px filter fields, approved KPI and modal radii, and leaves table/pagination classes unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Node test runner

---

### Task 1: Add the Page Geometry Regression Test

**Files:**
- Create: `frontend/src/app/(app)/risk/register/risk-register-geometry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("risk register primary controls follow shared geometry", () => {
  assert.match(
    source,
    /import \{ SearchInput \} from "@\/components\/ui\/search-input";/,
  );
  assert.match(source, /<SearchInput/);
  assert.doesNotMatch(source, /className="h-8 gap-2 shadow-none"/);
  assert.match(
    source,
    /className="h-11 rounded-xl border border-border\/50 bg-background\/80 text-xs"/,
  );
  assert.match(
    source,
    /className="flex min-h-\[96px\] flex-col rounded-2xl p-4"/,
  );
});

test("risk register modal content follows shared geometry", () => {
  assert.match(
    source,
    /className="rounded-2xl border bg-muted\/30 px-3 py-2 text-sm"/,
  );
  assert.match(
    source,
    /className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"/,
  );
});

test("risk register retains explicit dense table exceptions", () => {
  assert.match(source, /"h-6 rounded-lg border-0 px-2\.5 text-xs"/);
  assert.match(
    source,
    /className="h-7 w-\[65px\] text-xs bg-muted\/30 border-none"/,
  );
});
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
cd frontend
node --test 'src/app/(app)/risk/register/risk-register-geometry.test.ts'
```

Expected: FAIL because the page uses `Input`, `h-8` filter controls,
`rounded-lg` modal boxes, and a `rounded-md` textarea.

### Task 2: Align the Primary Page Geometry

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/page.tsx`

- [ ] **Step 1: Adopt SearchInput**

Add:

```tsx
import { SearchInput } from "@/components/ui/search-input";
```

Replace the toolbar `Input` with:

```tsx
<SearchInput
  placeholder={searchPlaceholder}
  value={search}
  onChange={(event) => onSearchChange(event.target.value)}
  className="border-border/50 bg-background/80 pl-10 text-xs"
/>
```

Keep the search icon vertically centered and move it to `left-4`.

- [ ] **Step 2: Remove main button override**

Change the filter trigger to:

```tsx
<Button variant="outline" className="gap-2 shadow-none">
```

Header action buttons already have no height or radius overrides and therefore
need no change.

- [ ] **Step 3: Align filter fields**

Use this class on both filter `Input` instances and all three filter
`SelectTrigger` instances:

```tsx
className="h-11 rounded-xl border border-border/50 bg-background/80 text-xs"
```

- [ ] **Step 4: Align KPI cards**

Change the KPI class to:

```tsx
className="flex min-h-[96px] flex-col rounded-2xl p-4"
```

- [ ] **Step 5: Align modal internals**

Change each modal summary box from `rounded-lg` to `rounded-2xl`, including
the confirmation content near the end of the page.

Change the archive textarea to:

```tsx
className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
```

Do not add geometry classes to `DialogContent`; it must inherit
`rounded-3xl p-6` from the shared primitive.

- [ ] **Step 6: Run the focused test**

Run:

```bash
cd frontend
node --test 'src/app/(app)/risk/register/risk-register-geometry.test.ts'
```

Expected: 3 tests PASS.

### Task 3: Verify the Page

**Files:**
- Verify: `frontend/src/app/(app)/risk/register/page.tsx`
- Verify: `frontend/src/app/(app)/risk/register/risk-register-geometry.test.ts`

- [ ] **Step 1: Run focused ESLint**

Run:

```bash
cd frontend
npx eslint 'src/app/(app)/risk/register/page.tsx' 'src/app/(app)/risk/register/risk-register-geometry.test.ts'
```

Expected: no new errors.

- [ ] **Step 2: Run shared and page geometry tests**

Run:

```bash
cd frontend
node --test src/components/ui/component-geometry.test.ts 'src/app/(app)/risk/register/risk-register-geometry.test.ts'
```

Expected: 16 tests PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Review the scoped diff**

Run:

```bash
git diff --check -- 'frontend/src/app/(app)/risk/register/page.tsx' 'frontend/src/app/(app)/risk/register/risk-register-geometry.test.ts'
git diff --stat -- 'frontend/src/app/(app)/risk/register/page.tsx' 'frontend/src/app/(app)/risk/register/risk-register-geometry.test.ts'
```

Expected: only the approved page geometry alignment and regression test appear
relative to the existing working tree.

