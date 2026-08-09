# Risk Form Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the risk registration and risk assessment forms with the visual language of the risk register page without changing behavior.

**Architecture:** Keep all existing React state, handlers, conditions, validation, and API integration intact. Apply a surgical presentation-only pass to the two page components, using the existing `FormPage`, `FormHeader`, shadcn primitives, and the visual geometry already established in the reference page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui.

---

## File Map

- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
  - Normalize page geometry, header actions, workspace navigation, accordion sections, nested panels, controls, and footer actions.
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
  - Normalize page geometry, header actions, accordion sections, content cards, supporting sidebar, and review states.
- Create: `frontend/src/app/(app)/risk/register/risk-form-visual-alignment.test.ts`
  - Protect the shared visual contracts and assert that behavior-related expressions remain present.

### Task 1: Add Visual Contract Test

**Files:**
- Create: `frontend/src/app/(app)/risk/register/risk-form-visual-alignment.test.ts`
- Reference: `frontend/src/app/(app)/risk/register/risk-register-geometry.test.ts`

- [ ] **Step 1: Write the failing source-contract test**

Create a Node test that loads both target files and asserts these contracts:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registrationSource = readFileSync(
  new URL("./new/page.tsx", import.meta.url),
  "utf8",
);
const assessmentSource = readFileSync(
  new URL("../assessment/[id]/page.tsx", import.meta.url),
  "utf8",
);

for (const [name, source] of [
  ["registration", registrationSource],
  ["assessment", assessmentSource],
] as const) {
  test(`${name} uses the shared full-width form shell`, () => {
    assert.match(source, /<FormPage className="max-w-none/);
    assert.match(source, /<FormHeader/);
  });

  test(`${name} uses the risk register section geometry`, () => {
    assert.match(
      source,
      /rounded-xl border border-border\/40 bg-card shadow-sm/,
    );
    assert.match(source, /px-5 py-4/);
    assert.match(source, /space-y-5 px-5 pb-6 pt-2/);
  });
}

test("registration behavior entry points remain intact", () => {
  assert.match(registrationSource, /handleSaveDraft/);
  assert.match(registrationSource, /openSubmitReviewConfirm/);
  assert.match(registrationSource, /handleExportPDF/);
});

test("assessment behavior entry points remain intact", () => {
  assert.match(assessmentSource, /handleSaveDraft/);
  assert.match(assessmentSource, /openSubmitReviewConfirm/);
  assert.match(assessmentSource, /router\.push\(backTarget\)/);
});
```

- [ ] **Step 2: Run the test and confirm the inconsistent assessment geometry fails**

Run:

```bash
cd frontend
./node_modules/.bin/tsx --test "src/app/(app)/risk/register/risk-form-visual-alignment.test.ts"
```

Expected: at least one assertion fails because the assessment page still uses mixed `rounded-lg`, ring-based, and `shadow-none` section geometry.

### Task 2: Align Registration Form Presentation

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Test: `frontend/src/app/(app)/risk/register/risk-form-visual-alignment.test.ts`

- [ ] **Step 1: Normalize the page shell and header actions**

Keep the existing `FormPage` and `FormHeader` props and handlers. Normalize:

```tsx
<FormPage className="max-w-none space-y-6">
```

Use compact action spacing:

```tsx
<div className="flex flex-wrap items-center gap-2">
```

Secondary actions use `variant="outline"`, `size="md"`, `gap-2`, restrained borders, and `shadow-none`. Primary submit actions retain the existing handler and disabled conditions while using the default primary button treatment.

- [ ] **Step 2: Normalize workspace navigation**

Keep all current tab values and `onValueChange` behavior. Apply:

```tsx
className="rounded-lg bg-muted/50 p-0.5 ring-1 ring-inset ring-border/50"
```

Each trigger uses:

```tsx
className="h-full rounded-md border border-transparent px-3 text-sm font-medium duration-200 data-active:border-border/50 data-active:bg-background group-data-[variant=default]/tabs-list:data-active:shadow-none"
```

- [ ] **Step 3: Normalize all major accordion sections**

Without changing values, conditions, or children, apply this container contract to every major registration section:

```tsx
className="scroll-mt-28 overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition-all data-[state=open]:border-primary/20"
```

Apply this header/content contract:

```tsx
<AccordionTrigger className="pointer-events-none cursor-default px-5 py-4 hover:bg-muted/30 hover:no-underline [&>svg]:hidden [&[data-state=open]>div>div>p]:text-primary">
<AccordionContent className="space-y-5 px-5 pb-6 pt-2">
```

- [ ] **Step 4: Normalize nested panels and form copy**

Replace inconsistent nested card geometry with:

```tsx
className="rounded-xl border border-border/40 bg-card p-5 shadow-sm"
```

Use `text-sm font-medium` for labels, `text-xs leading-5 text-muted-foreground` for helper text, and preserve existing destructive error classes and all input bindings.

- [ ] **Step 5: Run the contract test**

Run:

```bash
cd frontend
./node_modules/.bin/tsx --test "src/app/(app)/risk/register/risk-form-visual-alignment.test.ts"
```

Expected: registration assertions pass; assessment assertions may still fail.

### Task 3: Align Assessment Form Presentation

**Files:**
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
- Test: `frontend/src/app/(app)/risk/register/risk-form-visual-alignment.test.ts`

- [ ] **Step 1: Normalize page shell and header actions**

Use:

```tsx
<FormPage className="max-w-none space-y-6">
```

Keep status badges, version data, handlers, and disabled conditions unchanged. Align draft and submit buttons with the registration page's outline/default treatments.

- [ ] **Step 2: Preserve the assessment grid while aligning surfaces**

Retain the existing responsive two-column grid and all component order. Normalize main and side-column major surfaces to `rounded-xl border border-border/40 bg-card shadow-sm`.

- [ ] **Step 3: Normalize assessment accordion sections**

Apply the same major accordion contract used by registration:

```tsx
className="scroll-mt-28 overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition-all data-[state=open]:border-primary/20"
```

Use `px-5 py-4` triggers and `space-y-5 px-5 pb-6 pt-2` content spacing. Preserve functional expand/collapse controls and their current state.

- [ ] **Step 4: Normalize nested analysis and approval panels**

Convert mixed `rounded-lg`, ring-only, and stronger shadow surfaces to the shared card geometry. Preserve risk score controls, approval-line editors, reviewer state, and warning colors.

- [ ] **Step 5: Normalize supporting sidebar**

Keep `ProfilRisikoCard`, `SimpulanCard`, review metadata, and existing layout behavior. Align surrounding containers and section headers with the registration card hierarchy.

- [ ] **Step 6: Run the contract test**

Run:

```bash
cd frontend
./node_modules/.bin/tsx --test "src/app/(app)/risk/register/risk-form-visual-alignment.test.ts"
```

Expected: all tests pass.

### Task 4: Presentation-Only Diff Review

**Files:**
- Review: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Review: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

- [ ] **Step 1: Inspect the focused diff**

Run:

```bash
git diff -- "frontend/src/app/(app)/risk/register/new/page.tsx" "frontend/src/app/(app)/risk/assessment/[id]/page.tsx"
```

Expected: changes are limited to `className`, presentation wrappers, and non-behavioral JSX formatting. No handler body, API call, validation condition, route, or payload changes.

- [ ] **Step 2: Search for inconsistent major section geometry**

Run:

```bash
rg -n 'AccordionItem|rounded-lg|rounded-2xl|shadow-lg|shadow-none|ring-1 ring-inset' \
  "frontend/src/app/(app)/risk/register/new/page.tsx" \
  "frontend/src/app/(app)/risk/assessment/[id]/page.tsx"
```

Expected: remaining deviations are limited to deliberately compact controls, overlays, status callouts, or component-specific surfaces, not major form sections.

- [ ] **Step 3: Correct any visual-contract gaps**

Only adjust presentation classes. Re-run the contract test after each correction.

### Task 5: Final Verification

**Files:**
- Verify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Verify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
- Verify: `frontend/src/app/(app)/risk/register/risk-form-visual-alignment.test.ts`

- [ ] **Step 1: Run focused ESLint**

```bash
cd frontend
./node_modules/.bin/eslint \
  "src/app/(app)/risk/register/new/page.tsx" \
  "src/app/(app)/risk/assessment/[id]/page.tsx" \
  "src/app/(app)/risk/register/risk-form-visual-alignment.test.ts"
```

Expected: no new errors.

- [ ] **Step 2: Run TypeScript validation**

```bash
cd frontend
./node_modules/.bin/tsc --noEmit
```

Expected: no errors introduced by the changed files. Any repository-wide pre-existing test errors must be reported separately.

- [ ] **Step 3: Run focused tests**

```bash
cd frontend
./node_modules/.bin/tsx --test \
  "src/app/(app)/risk/register/risk-register-geometry.test.ts" \
  "src/app/(app)/risk/register/risk-form-visual-alignment.test.ts"
```

Expected: all focused tests pass.

- [ ] **Step 4: Perform authenticated visual review when available**

Review `/risk/register/new` and `/risk/assessment/:id` at desktop and mobile widths. Confirm header wrapping, section spacing, form-control alignment, side-panel stacking, and absence of horizontal overflow.
