# Monitoring Mitigation Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the `Progress Penanganan` summary area on the Monitoring page so it presents a mitigation-focused snapshot with `Total mitigasi aktif`, `Mitigasi selesai`, `Mitigasi overdue`, and a supporting `completion rate`.

**Architecture:** Keep the existing `/dashboard/action-pressure` endpoint and chart intact. Extract the mitigation-summary math into a small frontend helper in `frontend/src/lib` so the aggregation logic is testable, then update the summary block inside the existing monitoring card to consume that helper and render the new hierarchy.

**Tech Stack:** Next.js App Router + React 19 + TypeScript + shadcn/ui + Recharts + node:test.

---

## File Structure Map

### Existing files

- `frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx` — keeps the existing chart and receives the redesigned mitigation summary UI.
- `frontend/src/types/risk.ts` — already defines `DashboardActionPressurePoint`; no change expected unless implementation discovers a type mismatch.

### New files

- `frontend/src/lib/monitoring-mitigation-summary.ts` — pure helper that turns `DashboardActionPressurePoint[]` into summary totals and `completionRate`.
- `frontend/src/lib/monitoring-mitigation-summary.test.ts` — node:test coverage for non-zero, zero-total, and overdue-heavy datasets.

## Behavioral Rules

1. The existing chart inside `Progress Penanganan` remains in place.
2. The old generic stat row (`Total Penanganan`, `Selesai`, `Overdue`) is replaced.
3. The new primary labels are:
   - `Total mitigasi aktif`
   - `Mitigasi selesai`
   - `Mitigasi overdue`
4. `Completion rate` is rendered as secondary context below the three primary tiles, not as a fourth equal-weight KPI tile.
5. `Total mitigasi aktif` is defined as the total represented by the currently loaded `actionPressureData` dataset:
   - `sum(mitigationsCompleted + overdueMitigations)`
6. `Completion rate` is:
   - `completed / totalActive * 100`
   - `0` when `totalActive === 0`
7. Empty or all-zero states must keep the card structure stable and avoid division errors.
8. No API changes and no new endpoint calls are introduced.

## Task 1: Add a Testable Mitigation Summary Helper

**Files:**
- Create: `frontend/src/lib/monitoring-mitigation-summary.ts`
- Create: `frontend/src/lib/monitoring-mitigation-summary.test.ts`

- [ ] **Step 1: Write the failing test for the standard aggregation case**

Create `frontend/src/lib/monitoring-mitigation-summary.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildMonitoringMitigationSummary } from "./monitoring-mitigation-summary";

test("buildMonitoringMitigationSummary aggregates active, completed, overdue, and completion rate", () => {
  const result = buildMonitoringMitigationSummary([
    {
      period: "2026-01",
      incidentsCreated: 1,
      mitigationsCompleted: 8,
      overdueMitigations: 2,
    },
    {
      period: "2026-02",
      incidentsCreated: 0,
      mitigationsCompleted: 4,
      overdueMitigations: 1,
    },
  ]);

  assert.equal(result.totalActive, 15);
  assert.equal(result.completed, 12);
  assert.equal(result.overdue, 3);
  assert.equal(result.completionRate, 80);
});
```

- [ ] **Step 2: Add edge-case tests for zero-total and overdue-heavy datasets**

Append these tests to `frontend/src/lib/monitoring-mitigation-summary.test.ts`:

```ts
test("buildMonitoringMitigationSummary returns zero completion rate when the dataset is empty", () => {
  const result = buildMonitoringMitigationSummary([]);

  assert.equal(result.totalActive, 0);
  assert.equal(result.completed, 0);
  assert.equal(result.overdue, 0);
  assert.equal(result.completionRate, 0);
});

test("buildMonitoringMitigationSummary keeps overdue-heavy datasets stable", () => {
  const result = buildMonitoringMitigationSummary([
    {
      period: "2026-03",
      incidentsCreated: 2,
      mitigationsCompleted: 1,
      overdueMitigations: 5,
    },
  ]);

  assert.equal(result.totalActive, 6);
  assert.equal(result.completed, 1);
  assert.equal(result.overdue, 5);
  assert.equal(result.completionRate, 16.7);
});
```

- [ ] **Step 3: Run the new test file to verify it fails**

Run:

```bash
cd frontend
node --test src/lib/monitoring-mitigation-summary.test.ts
```

Expected:
- FAIL because `./monitoring-mitigation-summary` does not exist yet

- [ ] **Step 4: Implement the helper with a stable return shape**

Create `frontend/src/lib/monitoring-mitigation-summary.ts`:

```ts
import type { DashboardActionPressurePoint } from "@/types/risk";

export type MonitoringMitigationSummary = {
  totalActive: number;
  completed: number;
  overdue: number;
  completionRate: number;
};

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildMonitoringMitigationSummary(
  items: DashboardActionPressurePoint[],
): MonitoringMitigationSummary {
  const completed = items.reduce(
    (sum, item) => sum + item.mitigationsCompleted,
    0,
  );
  const overdue = items.reduce(
    (sum, item) => sum + item.overdueMitigations,
    0,
  );
  const totalActive = completed + overdue;

  return {
    totalActive,
    completed,
    overdue,
    completionRate:
      totalActive === 0 ? 0 : roundToSingleDecimal((completed / totalActive) * 100),
  };
}
```

- [ ] **Step 5: Run the test file again to verify it passes**

Run:

```bash
cd frontend
node --test src/lib/monitoring-mitigation-summary.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/lib/monitoring-mitigation-summary.ts frontend/src/lib/monitoring-mitigation-summary.test.ts
git commit -m "test: add monitoring mitigation summary helper"
```

Expected:
- a commit that adds the helper and its tests only

## Task 2: Replace the Generic Summary Row in the Monitoring Card

**Files:**
- Modify: `frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx`
- Use: `frontend/src/lib/monitoring-mitigation-summary.ts`

- [ ] **Step 1: Add a failing UI expectation by wiring the helper import and removing inline totals**

Edit the imports at the top of `frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx`:

```ts
import {
  buildMonitoringMitigationSummary,
} from "@/lib/monitoring-mitigation-summary";
```

Add a memo below `hasActionPressureData`:

```ts
  const mitigationSummary = useMemo(
    () => buildMonitoringMitigationSummary(actionPressureData),
    [actionPressureData],
  );
```

At this point, keep the old UI temporarily. This creates the new data path before the visual refactor.

- [ ] **Step 2: Replace the old three-box row with mitigation-focused tiles**

Replace the current summary block under the chart with:

```tsx
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Total mitigasi aktif
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {mitigationSummary.totalActive}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Total item mitigasi pada periode monitoring yang sedang dimuat.
                    </p>
                  </div>

                  <div className="rounded-xl border border-success/25 bg-success/10 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-success/80">
                      Mitigasi selesai
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {mitigationSummary.completed}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Item mitigasi yang sudah dituntaskan pada dataset saat ini.
                    </p>
                  </div>

                  <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-destructive/80">
                      Mitigasi overdue
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {mitigationSummary.overdue}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Item yang terlambat dan perlu tindak lanjut prioritas.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Completion rate
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Persentase mitigasi selesai dari total mitigasi aktif pada periode yang dimuat.
                      </p>
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      {mitigationSummary.completionRate}%
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[oklch(0.72_0.17_155)] transition-[width]"
                      style={{ width: `${mitigationSummary.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
```

- [ ] **Step 3: Keep the empty-state shell stable for zero-data cases**

Do not remove the existing fallback branch:

```tsx
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Data progress mitigasi belum tersedia untuk periode ini.
            </div>
          )}
```

The goal is to preserve the current card shell and fallback tone while changing only the loaded-state summary presentation.

- [ ] **Step 4: Run lint on the modified component**

Run:

```bash
cd frontend
./node_modules/.bin/eslint 'src/app/(app)/compliance/_components/monitoring-operational-panel.tsx' 'src/lib/monitoring-mitigation-summary.ts' 'src/lib/monitoring-mitigation-summary.test.ts'
```

Expected:
- PASS

- [ ] **Step 5: Commit**

Run:

```bash
git add 'frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx' 'frontend/src/lib/monitoring-mitigation-summary.ts' 'frontend/src/lib/monitoring-mitigation-summary.test.ts'
git commit -m "feat: refine monitoring mitigation summary"
```

Expected:
- a commit that updates the monitoring card UI and uses the tested helper

## Task 3: Final Verification and Responsive Spot Check

**Files:**
- Verify: `frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx`
- Verify: `frontend/src/lib/monitoring-mitigation-summary.ts`
- Verify: `frontend/src/lib/monitoring-mitigation-summary.test.ts`

- [ ] **Step 1: Run the targeted helper test**

Run:

```bash
cd frontend
node --test src/lib/monitoring-mitigation-summary.test.ts
```

Expected:
- PASS

- [ ] **Step 2: Run a production build**

Run:

```bash
cd frontend
npm run build
```

Expected:
- PASS
- `/compliance/monitoring` remains in the route output

- [ ] **Step 3: Manually verify the loaded state**

Check `/compliance/monitoring` in the browser and confirm:

```text
- The chart still appears inside "Progress Penanganan"
- The summary now shows three primary tiles:
  Total mitigasi aktif
  Mitigasi selesai
  Mitigasi overdue
- Completion rate appears below as secondary context
- Overdue has the strongest visual emphasis
```

- [ ] **Step 4: Manually verify zero and narrow layouts**

Check:

```text
- If the dataset is empty, the existing fallback message still appears
- On a narrow viewport, the three tiles wrap cleanly without overlapping
- The completion bar stays below the tiles and spans the available width
```

- [ ] **Step 5: Commit the verification checkpoint**

Run:

```bash
git add 'frontend/src/app/(app)/compliance/_components/monitoring-operational-panel.tsx' 'frontend/src/lib/monitoring-mitigation-summary.ts' 'frontend/src/lib/monitoring-mitigation-summary.test.ts'
git commit -m "chore: verify monitoring mitigation card refinement"
```

Expected:
- a final verification commit if any last-mile cleanup was needed during QA

## Spec Coverage Check

- `Total mitigasi aktif`, `Mitigasi selesai`, `Mitigasi overdue` are covered in Task 2.
- `Completion rate` as a secondary element is covered in Task 2.
- Stable zero-data handling is preserved in Task 2 and rechecked in Task 3.
- No API changes are enforced by Task 1 and Task 2 structure.
- Desktop/mobile behavior is explicitly checked in Task 3.

## Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation notes remain in the task steps.
- All code-touching steps include concrete code blocks.
- All verification steps include concrete commands or explicit visual checks.

## Type Consistency Check

- Summary helper output uses `totalActive`, `completed`, `overdue`, and `completionRate` consistently across tests and UI usage.
- The helper input remains `DashboardActionPressurePoint[]`, matching the existing endpoint response already used by the chart.
