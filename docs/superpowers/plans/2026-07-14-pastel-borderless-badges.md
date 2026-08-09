# Pastel Borderless Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved pastel, dark-text, borderless badge treatment globally with a larger readable type scale.

**Architecture:** Keep all visual semantics in the shared `badgeVariants` CVA configuration. Remove local palette duplication from the design-system preview and map its fixtures to supported `tone` values, then document the exact shared behavior in `DESIGN.md`.

**Tech Stack:** React 19, TypeScript, class-variance-authority, Tailwind CSS v4, Node test runner.

---

### Task 1: Add failing badge source contracts

**Files:**
- Create: `frontend/src/components/ui/badge-system.test.ts`

- [ ] Assert the base badge has `border-0`, 14px default text, and no base `border` utility.
- [ ] Assert compact is at least 24px high with 12px text and micro is at least 20px high with 11px text.
- [ ] Assert neutral, info/progress, success, warning, and danger use the approved pastel fills and dark text.
- [ ] Run `node --test src/components/ui/badge-system.test.ts` and confirm failure before implementation.

### Task 2: Implement the shared palette and sizes

**Files:**
- Modify: `frontend/src/components/ui/badge.tsx`

- [ ] Remove visible borders from base variants and every semantic tone while preserving focus rings and invalid signaling.
- [ ] Apply the approved pastel color pairs and larger default/compact/micro typography.
- [ ] Run the focused badge test and confirm it passes.

### Task 3: Synchronize the design-system catalogue

**Files:**
- Modify: `frontend/src/components/shared/design-system/data.ts`
- Modify: `frontend/src/components/shared/design-system/badge-system-preview.tsx`

- [ ] Replace fixture class strings with semantic tone identifiers.
- [ ] Render canonical `tone` and `size` props without local border, color, height, or font-size overrides.
- [ ] Keep status and risk labels readable without relying on color alone.

### Task 4: Synchronize DESIGN.md

**Files:**
- Modify: `DESIGN.md`

- [ ] Update `chip-default` tokens and badge prose with borderless pastel palette and 14/12/11px type scale.
- [ ] Remove obsolete guidance that compact badges use 10px text.

### Task 5: Verify

**Files:**
- Verify all files above.

- [ ] Run focused Node tests.
- [ ] Run ESLint on modified TypeScript files.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and inspect scoped hunks without overwriting unrelated local changes.
