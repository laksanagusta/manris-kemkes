# Monitoring Reporting Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Monitoring & Reporting tabs feel wider, less skinny, and easier to click while preserving the existing page structure.

**Architecture:** Keep the current `Tabs` structure and adjust only the presentation layer in the workspace component. Use a fuller segmented-control layout by widening the list container, letting triggers stretch evenly, and slightly increasing height and padding for better visual balance.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui Tabs

---

### Task 1: Update Monitoring Tab Layout

**Files:**
- Modify: `frontend/src/app/(app)/compliance/_components/monitoring-reporting-workspace.tsx`

- [ ] **Step 1: Write the failing test**

No automated UI test harness exists in this frontend package yet. Use a manual failing check for this presentational change by reviewing the current tab bar in the browser and confirming both tabs look visually narrow because they rely on fixed `min-w` widths.

- [ ] **Step 2: Run the failing check**

Run the app and open `/compliance/monitoring`.

```bash
npm run dev
```

Expected: the `Mitigasi` and `KRI` tabs render as narrow pills instead of using the available row width.

- [ ] **Step 3: Write the minimal implementation**

Update the tab classes in `frontend/src/app/(app)/compliance/_components/monitoring-reporting-workspace.tsx` so the list can expand and each trigger uses `flex-1`, larger horizontal padding, and a slightly taller hit area.

```tsx
<div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
  <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border/60 bg-muted/30 p-1.5 md:w-auto md:min-w-[360px]">
    <TabsTrigger value="mitigations" className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm">
      <ClipboardCheck className="size-4" />
      Mitigasi
    </TabsTrigger>
    <TabsTrigger value="kri" className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm">
      <Activity className="size-4" />
      KRI
    </TabsTrigger>
  </TabsList>
  <p className="text-xs text-muted-foreground">
    {isPending ? "Memuat tampilan..." : activeMeta.description}
  </p>
</div>
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run lint -- src/app/\(app\)/compliance/_components/monitoring-reporting-workspace.tsx && npx tsc --noEmit
```

Expected: lint exits cleanly and TypeScript completes without errors.

- [ ] **Step 5: Manual UI verification**

Re-open `/compliance/monitoring` and confirm:

```text
- both tabs feel wider and more balanced
- the click target is larger
- mobile layout still stacks cleanly with the description below
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-03-31-monitoring-reporting-tabs.md frontend/src/app/\(app\)/compliance/_components/monitoring-reporting-workspace.tsx
git commit -m "refactor: widen monitoring workspace tabs"
```
