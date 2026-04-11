# Approval Workflow Stepper Design

**Date:** 2026-04-11  
**Status:** Draft — awaiting review  
**Author:** AI Assistant

## Overview

Add a vertical workflow stepper to the `review-side-panel.tsx` component that shows the current approval progress at a glance. The stepper replaces the existing status badge and follows the universal sidebar pattern used by GitHub, Jira, ServiceNow: **sidebar = compact status, Log tab = full audit trail**.

## Problem Statement

### Current State
- `review-side-panel.tsx` shows two action cards (Reviewer + Pimpinan) with status badges, but **no visual indication of who acted, when, or where the workflow currently stands**
- The pimpinan has no visibility into reviewer's decision before acting
- A status badge ("Sedang Ditinjau") exists but provides no workflow context
- Full approval history exists in the **Log & Komunikasi tab** (`risk-log-timeline.tsx`) but is not surfaced in the approval panel

### What Exists
- **Backend**: `GET /approvals/:id` returns `Steps[]` (with `ApproverName`, `ApproverRole`, `StepType`, `Status`, `ActedAt`) and `History[]` (immutable audit log)
- **Backend**: `GET /approvals/by-entity?request_type=risk&entity_id=X` returns same data
- **Frontend**: `risk-log-timeline.tsx` already renders approval history in the Log tab
- **Frontend**: Working paper signing page has a vertical stepper timeline (reference pattern)

## Goals

1. Give reviewers and pimpinan instant workflow context before acting
2. Replace the redundant status badge with a more informative stepper
3. Avoid duplicating information already shown in the Log & Komunikasi tab
4. Reuse the vertical timeline visual pattern from the working paper signing page
5. Maintain ISO 31000:2018 audit trail compliance (full history stays in Log tab)

## Non-Goals

1. No changes to the Log & Komunikasi tab — it stays unchanged
2. No full approval history in the side panel (comments, timestamps belong in Log tab)
3. No changes to the backend API — existing endpoints already return sufficient data
4. No changes to the approval action flow (approve/reject/return mechanics stay the same)
5. No horizontal stepper — vertical orientation confirmed

## Core Decision

**The stepper replaces the status badge and shows 3 fixed nodes (Diajukan → Ditinjau → Persetujuan) with actor names and state icons. No comments or timestamps in the stepper. A "Lihat riwayat →" link at the bottom navigates to the Log tab for full audit trail.**

This follows the GitHub PR sidebar pattern: compact status in sidebar, full conversation in main area.

## Design

### Stepper Structure

3 fixed nodes, always rendered:

```
Node 1: "Diajukan"    — Unit submitter
Node 2: "Ditinjau"    — Reviewer
Node 3: "Persetujuan" — Pimpinan
```

### Node States

Each node has one of 4 visual states:

| State | Icon | Line Below | Opacity | When |
|---|---|---|---|---|
| `completed` | ✓ green checkmark (`CheckCircle2`) | `bg-success` solid green | 100% | Step finished with approval |
| `current` | ● blue pulsing dot (`animate-pulse`) | `bg-primary/30` | 100% | Step is active, waiting for action |
| `upcoming` | ○ gray circle (`Circle`) | `bg-border` | 75% | Step not yet reached |
| `rejected` | ✗ red X (`XCircle`) | `bg-destructive/30` | 100% | Final step ended with rejection |

### Node Content (per node)

```
[Icon] Step Label · Actor Name    [Status Badge]
       Step description (1 line)
```

- **Step Label**: "Diajukan" / "Ditinjau" / "Persetujuan"
- **Actor Name**: From `ApprovalStep.ApproverName` or submitter name
- **Status Badge**: Small pill badge matching `timelineStatusClassName` from working paper page
- **Description**: Contextual 1-liner (e.g., "Menunggu keputusan Anda" for current action owner)

### Final State Behavior

When workflow reaches terminal state:
- **Approved**: Last step icon changes to ✓ green, label changes to "Disetujui"
- **Rejected**: Last step (wherever rejection happened) icon changes to ✗ red, label changes to "Ditolak"
- All preceding completed steps remain ✓ green

### Panel Layout (New Structure)

```
┌────────────────────────────┐
│ Vertical Stepper            │  ← NEW: replaces status badge
│  ✓ Diajukan · Dr.Ahmad     │
│  │                          │
│  ✓ Ditinjau · Ir.Budi      │
│  │                          │
│  ● Persetujuan · Prof.Citra│
│                              │
│  💬 "Lihat riwayat →"       │  ← link to Log & Komunikasi tab
├────────────────────────────┤
│ 📋 Penilaian Reviewer       │  ← existing card (unchanged)
│  [Scoring / Summary / Info] │
├────────────────────────────┤
│ 🛡 Persetujuan Risiko       │  ← existing card (unchanged)
│  [Preview / Actions / Info] │
└────────────────────────────┘
```

### Removed Element

- The `getStatusBadge()` function and its `<div className="flex justify-end">` wrapper are removed
- The stepper itself communicates the workflow status — the badge is redundant

### "Lihat riwayat →" Link

- Rendered below the stepper, right-aligned
- Text: "Lihat riwayat →"
- Style: `text-xs text-primary hover:underline`
- Action: Navigates/scrolls to the Log & Komunikasi tab on the same page
- Implementation: Either scroll to tab section or programmatically switch to Log tab (depends on parent page tab mechanism)

## Data Model

### No Backend Changes Required

Existing `GET /approvals/by-entity` response already provides:

```typescript
{
  id: string;
  currentStatus: "pending" | "approved" | "rejected";
  currentApproverRole: "reviewer" | "pimpinan";
  currentApproverUserId: string;
  steps: Array<{
    approverUserId: string;
    approverName: string;
    stepType: "review" | "approval";
    status: "pending" | "approved" | "rejected";
  }>;
}
```

### Frontend View Model

New function `buildApprovalStepperViewModel` to transform API data into stepper nodes:

```typescript
type StepperNodeState = "completed" | "current" | "upcoming" | "rejected";

interface ApprovalStepperNode {
  label: string;           // "Diajukan" | "Ditinjau" | "Persetujuan"
  actorName: string;       // From steps[].approverName or submitter
  state: StepperNodeState;
  isActionOwner: boolean;  // true if currentUserId matches step approver
  description: string;     // Contextual 1-liner
}

function buildApprovalStepperViewModel(
  approvalWorkflow: RiskWorkflowState,
  riskStatus: string,
  currentUserId?: string,
): ApprovalStepperNode[];
```

### Submitter Node Data

The "Diajukan" (submitted) node requires the submitter's name. This is available from:
- `ApprovalHistory[0]` where `action === "submitted"` → `actorName`
- Or from the risk's `createdByName` field

If submitter name is not available in current props, fallback to "Unit Pengelola" as generic label.

### Node State Derivation Logic

```
Node 1 (Diajukan):
  - Always "completed" once approval workflow exists
  - (If workflow exists, submission already happened)

Node 2 (Ditinjau):
  - "completed" if review step status === "approved"
  - "current" if workflowStage === "review"
  - "rejected" if review step status === "rejected" AND workflowStage === "final"
  - "upcoming" otherwise

Node 3 (Persetujuan):
  - "completed" if approval step status === "approved"
  - "current" if workflowStage === "approval"
  - "rejected" if approval step status === "rejected" AND workflowStage === "final"
  - "upcoming" otherwise
```

## Visual Reference

Reuse styling from working paper signing timeline (`working-papers/[id]/page.tsx`):

```typescript
const stepperStateClassName = {
  completed: "border-success/20 bg-success/10 text-success",
  current: "border-primary/20 bg-primary/[0.06] text-primary",
  upcoming: "border-border bg-muted/40 text-muted-foreground",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
};
```

Icon sizing, connector lines, spacing — all match the working paper pattern for visual consistency across the app.

## Scope

### Files to Modify

1. **`frontend/src/components/risk/review-side-panel.tsx`**
   - Remove `getStatusBadge()` function and its wrapper
   - Add stepper section above existing cards
   - Add "Lihat riwayat →" link below stepper
   - Import new view model builder

2. **New file: `frontend/src/lib/approval-stepper-view-model.ts`**
   - `buildApprovalStepperViewModel()` function
   - `ApprovalStepperNode` type
   - `StepperNodeState` type
   - Node state derivation logic

### Files NOT Modified

- `risk-log-timeline.tsx` — unchanged
- `inbox/page.tsx` — unchanged
- Backend API — unchanged
- Any other component — unchanged

## Edge Cases

1. **No approval workflow yet** (risk in draft): Panel already returns `null` when `!approvalId` — stepper is not rendered
2. **Submitter name unavailable**: Fallback to "Unit Pengelola"
3. **Risk rejected at review stage**: Node 2 shows ✗ red "Ditolak", Node 3 stays ○ gray "upcoming"
4. **Risk rejected at approval stage**: Node 2 shows ✓ green "Ditinjau", Node 3 shows ✗ red "Ditolak"
5. **Risk returned** (sent back for revision): Treat as rejection at the step that returned it — the stepper shows the current cycle's state, not historical cycles. Full back-and-forth history lives in Log tab.

## Testing Criteria

1. Stepper renders 3 nodes with correct labels when approval workflow exists
2. Correct node highlighted as "current" based on `workflowStage`
3. Actor names populated from `ApprovalStep` data
4. Final state shows ✓ or ✗ based on outcome
5. "Lihat riwayat →" link navigates to Log tab
6. Status badge no longer rendered (replaced by stepper)
7. Existing reviewer/approval card functionality unchanged
8. Panel still returns `null` when no approval workflow
