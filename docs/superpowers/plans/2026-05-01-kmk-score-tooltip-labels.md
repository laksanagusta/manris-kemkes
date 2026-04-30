# KMK Score Tooltip Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align probability and impact labels in risk score tooltip UI with KMK wording across risk register and reassessment pages.

**Architecture:** Reuse `PROBABILITY_LABELS` and `IMPACT_LABELS` from `frontend/src/lib/risk.ts` as single source of truth. Update both page-level score widgets to render labels from shared constants instead of hardcoded strings.

**Tech Stack:** Next.js App Router + React + TypeScript + node:test + existing form UI.

---

## File Structure Map

- Modify: `frontend/src/lib/risk.test.ts` — add regression coverage for KMK label constants if needed by new shared usage.
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx` — replace hardcoded score tooltip/display labels with shared constants.
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — replace hardcoded score tooltip/display labels with shared constants.

### Task 1: Update shared score label usage

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
- Test/verify: `frontend/src/lib/risk.test.ts`

- [ ] **Step 1: Locate score tooltip/display label blocks**
- [ ] **Step 2: Write/extend failing verification by identifying stale hardcoded labels or missing shared usage**
- [ ] **Step 3: Replace hardcoded probability labels with `PROBABILITY_LABELS[val]`**
- [ ] **Step 4: Replace hardcoded impact labels with `IMPACT_LABELS[val]`**
- [ ] **Step 5: Apply same change in reassessment page**
- [ ] **Step 6: Run verification**

```bash
cd frontend
npm test -- risk.test.ts
npm run build
```

Expected: PASS.
