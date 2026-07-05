# App Header Separator Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the AppHeader vertical separator without changing shared separator behavior.

**Architecture:** Add a focused source-level regression test for the required orientation-aware utility classes. Replace the header's unconditional alignment utility with vertical-state overrides that supersede the shared component's stretch rule.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS 4, Node test runner

---

### Task 1: Add the Alignment Regression Test

**Files:**
- Create: `frontend/src/components/app-header-alignment.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./app-header.tsx", import.meta.url),
  "utf8",
);

test("vertical header separator overrides shared stretch alignment", () => {
  assert.match(
    source,
    /className="data-vertical:h-4 data-vertical:self-center"/,
  );
});
```

- [ ] **Step 2: Run the test and confirm the expected failure**

Run:

```bash
cd frontend
node --test src/components/app-header-alignment.test.ts
```

Expected: FAIL because `app-header.tsx` still uses the unconditional
`self-center` and arbitrary orientation selector.

### Task 2: Apply the Local Alignment Fix

**Files:**
- Modify: `frontend/src/components/app-header.tsx`

- [ ] **Step 1: Replace the separator class**

Use:

```tsx
<Separator
  orientation="vertical"
  className="data-vertical:h-4 data-vertical:self-center"
/>
```

- [ ] **Step 2: Re-run the focused test**

Run:

```bash
cd frontend
node --test src/components/app-header-alignment.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run focused lint**

Run:

```bash
cd frontend
npx eslint src/components/app-header.tsx src/components/app-header-alignment.test.ts
```

Expected: ESLint exits successfully with no errors.

- [ ] **Step 4: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 5: Review the scoped diff**

Run:

```bash
git diff --check -- frontend/src/components/app-header.tsx frontend/src/components/app-header-alignment.test.ts
git diff -- frontend/src/components/app-header.tsx frontend/src/components/app-header-alignment.test.ts
```

Expected: the diff contains only the regression test and the separator class
replacement relative to the existing working tree.

