# Mitigation Completed-State UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mitigation monitoring table treat completed reports as finished rows instead of still-looking-overdue rows.

**Architecture:** Keep the existing mitigation task fetch and submission flow. Update the row-view model only where the table renders status-dependent columns so `done` rows show a finished state in `Hari` and `Eskalasi`, while overdue behavior remains unchanged for pending items. Preserve the existing detail dialog and submit dialog behavior.

**Tech Stack:** Next.js App Router, React, TypeScript, shadcn/ui, existing mitigation monitoring helpers

---

### Task 1: Update the mitigation table row rendering

**Files:**
- Modify: `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:388-655`

- [ ] **Step 1: Write the view logic change**

```tsx
const isDone = item.status === "done";
const dayLabel = isDone ? "Selesai" : item.daysOverdue > 0 ? `+${item.daysOverdue}` : String(item.daysOverdue);
const escalationLabel = isDone ? "Selesai" : tier.label;
```

- [ ] **Step 2: Apply the row rendering change**

```tsx
<TableCell className="text-center">
  <span
    className={cn(
      "text-sm font-medium tabular-nums",
      isDone ? "text-success" : item.daysOverdue > 0 ? tier.color : "text-zinc-900",
    )}
  >
    {dayLabel}
  </span>
</TableCell>
<TableCell>
  {isDone ? (
    <span className="text-sm text-success">Selesai</span>
  ) : (
    <Badge
      className={cn(
        item.tier === "upcoming"
          ? getLinearToneBadgeClass("neutral")
          : item.tier === "reminder"
            ? getLinearToneBadgeClass("progress")
            : item.tier === "light"
              ? getLinearToneBadgeClass("warning")
              : getLinearToneBadgeClass("danger"),
      )}
    >
      {escalationLabel}
    </Badge>
  )}
</TableCell>
```

- [ ] **Step 3: Keep completed rows read-only in the action column**

```tsx
{item.status === "done" ? (
  <span className="text-sm text-success">Selesai</span>
) : !submissionState.allowed ? (
  ...
) : (
  ...
)}
```

- [ ] **Step 4: Rebuild the frontend**

Run: `npm run build`
Expected: build finishes successfully with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx docs/superpowers/plans/2026-05-26-mitigation-completed-state-ui.md
git commit -m "feat: clarify completed mitigation rows"
```
