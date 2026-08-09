# Design System Dialog and Card Header Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dialog actions compact and align every design-system card header with the KPI card header pattern.

**Architecture:** Keep the change local to the design-system reference page and its documentation. Add a source-contract test so future edits cannot silently reintroduce inconsistent header classes or default-size dialog buttons.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Node test runner.

---

### Task 1: Add visual contract coverage

**Files:**
- Create: `frontend/src/app/(app)/design-system/design-system-visual-contract.test.ts`

- [ ] Write a Node test that reads `page.tsx`, extracts every `CardHeader`, and asserts the canonical KPI header shell and title typography are present.
- [ ] Add a second test asserting all six Dialog/AlertDialog trigger and footer actions explicitly use `size="sm"`.
- [ ] Run `node --test 'src/app/(app)/design-system/design-system-visual-contract.test.ts'` from `frontend`; expect failures against the current page.

### Task 2: Align the page implementation

**Files:**
- Modify: `frontend/src/app/(app)/design-system/page.tsx`

- [ ] Replace every demonstrated `CardHeader` class with `border-b border-border/60 px-4 py-6` and every corresponding `CardTitle` class with `text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground`.
- [ ] Set `size="sm"` on both dialog triggers and all four footer actions while preserving variants and handlers.
- [ ] Re-run the focused Node test; expect both tests to pass.

### Task 3: Synchronize documentation and verify

**Files:**
- Modify: `DESIGN.md`

- [ ] Document compact `size="sm"` dialog trigger/footer actions in the Buttons section.
- [ ] Expand the Dashboard Card rule to state that all titled card headers use the KPI-derived shell and title typography.
- [ ] Run the focused Node test and frontend lint command, then inspect the scoped diff.
