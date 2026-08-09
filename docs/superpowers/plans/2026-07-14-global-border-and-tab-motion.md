# Global Border and Tab Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize neutral component borders through global tokens and add accessible direction-aware transitions to shared tab content.

**Architecture:** Keep neutral boundary color centralized in `globals.css` so existing `border-border` and `border-input` consumers inherit it. Extend the shared Radix Tabs wrapper with a small context that tracks registered tab order and navigation direction, then expose that direction through data attributes consumed by transform-and-opacity CSS animations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Radix UI Tabs, Tailwind CSS v4, Node test runner.

---

### Task 1: Lock the shared design rules with source tests

**Files:**
- Create: `frontend/src/components/ui/tabs-motion.test.ts`
- Modify: `frontend/src/components/linear-shell-surfaces.test.ts`

- [ ] **Step 1: Write failing source-contract tests**

Add assertions that `tabs.tsx` contains direction state, ordered trigger registration, `data-motion-direction`, and reduced-motion classes. Add assertions that light and dark `--border` and `--input` tokens use the selected zinc-gray values.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/components/ui/tabs-motion.test.ts src/components/linear-shell-surfaces.test.ts`

Expected: FAIL because directional tab motion and the new neutral token values are absent.

- [ ] **Step 3: Keep tests focused on public source contracts**

Do not render Radix primitives in this repository's dependency-free Node test setup. Assert the stable component data attributes/classes and CSS token declarations instead.

### Task 2: Implement direction-aware shared Tabs motion

**Files:**
- Modify: `frontend/src/components/ui/tabs.tsx`

- [ ] **Step 1: Add controlled/uncontrolled value tracking**

Wrap the existing Radix root with local state that respects `value`, `defaultValue`, and `onValueChange`. Preserve every existing root prop and ARIA behavior.

- [ ] **Step 2: Register trigger order and derive direction**

Use a Tabs-local context. Each `TabsTrigger` registers its string value in DOM/render order. On a value change, compare previous and next indices and store `forward` or `backward`.

- [ ] **Step 3: Expose composited animation state**

Set `data-motion-direction` on `TabsContent`. Use short translate/opacity keyframes or Tailwind arbitrary data variants with 220ms `--ease-in-out`; add `motion-reduce:transform-none` and `motion-reduce:animate-none`. Do not animate width, height, margin, padding, left, or top.

- [ ] **Step 4: Run focused test**

Run: `npm test -- src/components/ui/tabs-motion.test.ts`

Expected: PASS.

### Task 3: Apply the table-gray neutral token globally

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Update neutral boundary tokens**

Set light `--border` and `--input` to the table shell's zinc-gray equivalent `rgb(228 228 231 / 80%)`. Set dark values to a legible zinc-gray counterpart while leaving semantic colors and `--ring` unchanged.

- [ ] **Step 2: Run the source-contract test**

Run: `npm test -- src/components/linear-shell-surfaces.test.ts`

Expected: PASS.

### Task 4: Synchronize the canonical design documentation

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Update machine-readable color tokens**

Change `colors.border` and `colors.input` to the light zinc-gray global boundary value without altering unrelated pending design edits.

- [ ] **Step 2: Document boundary and Tabs motion rules**

State that neutral component boundaries inherit the global table-gray token, semantic borders remain semantic, and shared tab content uses a 220ms direction-aware transform/opacity transition with reduced-motion suppression.

- [ ] **Step 3: Validate documentation structure**

Run: `npx @google/design.md lint DESIGN.md`

Expected: PASS, or record an external-tool failure separately from implementation correctness.

### Task 5: Verify the integrated change

**Files:**
- Verify: `frontend/src/components/ui/tabs.tsx`
- Verify: `frontend/src/app/globals.css`
- Verify: `DESIGN.md`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/components/ui/tabs-motion.test.ts src/components/linear-shell-surfaces.test.ts`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint -- src/components/ui/tabs.tsx src/components/ui/tabs-motion.test.ts src/components/linear-shell-surfaces.test.ts`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Next.js production build completes successfully. If unrelated pre-existing failures occur, report their exact files and messages without modifying unrelated user work.

- [ ] **Step 4: Review the final diff**

Confirm only scoped hunks were added to already-modified files and that no semantic border color was globally replaced.
