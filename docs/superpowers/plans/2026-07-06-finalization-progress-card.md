# Finalization Progress Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the finalization checklist with a modal-styled, five-segment progress bar without visible items or numbers.

**Architecture:** Reuse the existing `sectionStatuses` state as the single source of truth. Render one presentational segment per section and keep the existing sidebar structure and validation behavior unchanged.

**Tech Stack:** React 19, TypeScript, Next.js 16, Tailwind CSS v4, Node test runner

---

### Task 1: Add Visual Regression Assertions

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/risk-form-visual-alignment.test.ts`

- [ ] **Step 1: Write the failing assertions**

Add assertions that require the segmented progress group and reject the old
clickable checklist:

```ts
assert.match(registrationSource, /aria-label=\{`Kesiapan finalisasi:/);
assert.match(registrationSource, /sectionStatuses\.map\(\(section\) =>/);
assert.doesNotMatch(registrationSource, /onClick=\{\(\) => scrollToSection\(section\.id\)\}/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd frontend
node --experimental-strip-types --test 'src/app/(app)/risk/register/risk-form-visual-alignment.test.ts'
```

Expected: the new progress-group assertion fails.

### Task 2: Replace Checklist with Segmented Progress

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`

- [ ] **Step 1: Replace the badge and item list**

Keep the existing card shell and title, then render:

```tsx
<div
  className="grid grid-cols-5 gap-1.5"
  role="progressbar"
  aria-label={`Kesiapan finalisasi: ${completedSectionCount} dari ${sectionStatuses.length} bagian selesai`}
  aria-valuemin={0}
  aria-valuemax={sectionStatuses.length}
  aria-valuenow={completedSectionCount}
>
  {sectionStatuses.map((section) => (
    <span
      key={section.id}
      aria-hidden="true"
      className={cn(
        "h-1.5 rounded-full transition-colors",
        section.done ? "bg-primary" : "bg-muted",
      )}
    />
  ))}
</div>
```

Remove the visible completion badge, clickable section buttons, and status
icons from this card.

- [ ] **Step 2: Run the focused test**

Run:

```bash
cd frontend
node --experimental-strip-types --test 'src/app/(app)/risk/register/risk-form-visual-alignment.test.ts'
```

Expected: all focused tests pass.

- [ ] **Step 3: Run lint and diff validation**

Run:

```bash
cd frontend
./node_modules/.bin/eslint 'src/app/(app)/risk/register/new/page.tsx' 'src/app/(app)/risk/register/risk-form-visual-alignment.test.ts'
git diff --check -- 'src/app/(app)/risk/register/new/page.tsx' 'src/app/(app)/risk/register/risk-form-visual-alignment.test.ts'
```

Expected: both commands exit successfully with no errors.
