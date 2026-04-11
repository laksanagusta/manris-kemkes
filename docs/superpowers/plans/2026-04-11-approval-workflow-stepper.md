# Approval Workflow Stepper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the status badge in `review-side-panel.tsx` with a vertical approval stepper showing 3 fixed nodes (Diajukan → Ditinjau → Persetujuan) with actor names and state icons. Add a "Lihat riwayat →" link to navigate to the Log & Komunikasi tab. No backend changes.

**Architecture:** Create a pure view-model function `buildApprovalStepperViewModel()` following the same pattern as `working-paper-detail-view-model.ts`. The view model transforms existing `RiskWorkflowState` props into renderable stepper nodes. The stepper UI reuses the vertical timeline pattern from the working paper signing page (`working-papers/[id]/page.tsx` lines 562-649). The `ReviewSidePanel` receives a new `onNavigateToLog` callback prop to switch the parent page's `activeView` state to `"log"`.

**Spec:** `docs/superpowers/specs/2026-04-11-approval-workflow-stepper-design.md`

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS v4, shadcn/ui, Lucide icons

---

### Task 1: Create the Approval Stepper View Model

**Files:**
- Create: `frontend/src/lib/approval-stepper-view-model.ts`
- Reference: `frontend/src/lib/working-paper-detail-view-model.ts` (pattern to follow)
- Reference: `frontend/src/components/risk/review-side-panel.tsx` lines 34-44 (`RiskWorkflowState` type)

- [ ] **Step 1: Create the view model file with types and builder function**

Create `frontend/src/lib/approval-stepper-view-model.ts` with the following content:

```typescript
import type { RiskWorkflowState } from "@/components/risk/review-side-panel";

export type StepperNodeState = "completed" | "current" | "upcoming" | "rejected";

export type ApprovalStepperNode = {
  label: string;
  actorName: string;
  state: StepperNodeState;
  isActionOwner: boolean;
  description: string;
};

/**
 * Derives the workflow stage from approval and risk state.
 * Mirrors the logic in ReviewSidePanel (lines 103-122) but kept pure for testability.
 */
function deriveWorkflowStage(
  approvalWorkflow: RiskWorkflowState,
  riskStatus: string,
): "review" | "approval" | "final" | "unknown" {
  const workflowStatus = approvalWorkflow.currentStatus ?? null;
  const currentApproverRole = approvalWorkflow.currentApproverRole ?? null;

  if (
    workflowStatus === "approved" ||
    workflowStatus === "rejected" ||
    riskStatus === "approved" ||
    riskStatus === "rejected"
  ) {
    return "final";
  }

  if (workflowStatus === "pending") {
    if (currentApproverRole === "reviewer") return "review";
    if (currentApproverRole === "pimpinan") return "approval";
  }

  if (riskStatus === "in_review") return "review";
  if (riskStatus === "in_approval") return "approval";

  return "unknown";
}

/**
 * Transforms RiskWorkflowState into 3 stepper nodes for the approval panel.
 *
 * Node 1 — "Diajukan" (submitted): always completed when workflow exists.
 * Node 2 — "Ditinjau" (reviewed): maps to the review step.
 * Node 3 — "Persetujuan" (approved): maps to the approval step.
 */
export function buildApprovalStepperViewModel(
  approvalWorkflow: RiskWorkflowState,
  riskStatus: string,
  currentUserId?: string,
): ApprovalStepperNode[] {
  const steps = approvalWorkflow.steps ?? [];
  const workflowStage = deriveWorkflowStage(approvalWorkflow, riskStatus);

  const reviewStep = steps.find((s) => s.stepType === "review");
  const approvalStep = steps.find((s) => s.stepType === "approval");

  // --- Node 1: Diajukan (Submitted) ---
  // Always "completed" once the approval workflow exists.
  const submittedNode: ApprovalStepperNode = {
    label: "Diajukan",
    actorName: "Unit Pengelola",
    state: "completed",
    isActionOwner: false,
    description: "Risiko telah diajukan untuk ditinjau.",
  };

  // --- Node 2: Ditinjau (Reviewed) ---
  const reviewNode: ApprovalStepperNode = (() => {
    const actorName = reviewStep?.approverName ?? "Reviewer";
    const isActionOwner = Boolean(
      currentUserId && reviewStep?.approverUserId === currentUserId,
    );

    if (reviewStep?.status === "approved") {
      return {
        label: "Ditinjau",
        actorName,
        state: "completed" as const,
        isActionOwner: false,
        description: "Tahap tinjauan telah selesai.",
      };
    }

    if (reviewStep?.status === "rejected" && workflowStage === "final") {
      return {
        label: "Ditolak",
        actorName,
        state: "rejected" as const,
        isActionOwner: false,
        description: "Risiko ditolak pada tahap tinjauan.",
      };
    }

    if (workflowStage === "review") {
      return {
        label: "Ditinjau",
        actorName,
        state: "current" as const,
        isActionOwner,
        description: isActionOwner
          ? "Menunggu keputusan Anda."
          : `Menunggu tinjauan dari ${actorName}.`,
      };
    }

    return {
      label: "Ditinjau",
      actorName,
      state: "upcoming" as const,
      isActionOwner: false,
      description: "Tahap tinjauan belum dimulai.",
    };
  })();

  // --- Node 3: Persetujuan (Approval) ---
  const approvalNode: ApprovalStepperNode = (() => {
    const actorName = approvalStep?.approverName ?? "Pimpinan";
    const isActionOwner = Boolean(
      currentUserId && approvalStep?.approverUserId === currentUserId,
    );

    if (approvalStep?.status === "approved") {
      return {
        label: "Disetujui",
        actorName,
        state: "completed" as const,
        isActionOwner: false,
        description: "Risiko telah disetujui.",
      };
    }

    if (approvalStep?.status === "rejected" && workflowStage === "final") {
      return {
        label: "Ditolak",
        actorName,
        state: "rejected" as const,
        isActionOwner: false,
        description: "Risiko ditolak pada tahap persetujuan.",
      };
    }

    if (workflowStage === "approval") {
      return {
        label: "Persetujuan",
        actorName,
        state: "current" as const,
        isActionOwner,
        description: isActionOwner
          ? "Menunggu keputusan Anda."
          : `Menunggu persetujuan dari ${actorName}.`,
      };
    }

    return {
      label: "Persetujuan",
      actorName,
      state: "upcoming" as const,
      isActionOwner: false,
      description: "Tahap persetujuan belum dimulai.",
    };
  })();

  return [submittedNode, reviewNode, approvalNode];
}
```

- [ ] **Step 2: Verify the file has zero LSP diagnostics**

Run LSP diagnostics on `frontend/src/lib/approval-stepper-view-model.ts` and confirm zero errors.

---

### Task 2: Add `onNavigateToLog` Prop to ReviewSidePanel

**Files:**
- Modify: `frontend/src/components/risk/review-side-panel.tsx`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`

- [ ] **Step 1: Add `onNavigateToLog` to `ReviewSidePanelProps` interface**

In `frontend/src/components/risk/review-side-panel.tsx`, find this code (around line 49-61):

```typescript
interface ReviewSidePanelProps {
  approvalId: string | null;
  approvalWorkflow?: RiskWorkflowState | null;
  currentUserId?: string;
  riskStatus: string;
  userRole: string;
  inherentScore?: number;
  reviewedScore?: number | null;
  reviewedProbability?: number | null;
  reviewedImpact?: number | null;
  token?: string;
  onActionComplete?: () => void;
}
```

Add `onNavigateToLog` to the interface:

```typescript
interface ReviewSidePanelProps {
  approvalId: string | null;
  approvalWorkflow?: RiskWorkflowState | null;
  currentUserId?: string;
  riskStatus: string;
  userRole: string;
  inherentScore?: number;
  reviewedScore?: number | null;
  reviewedProbability?: number | null;
  reviewedImpact?: number | null;
  token?: string;
  onActionComplete?: () => void;
  onNavigateToLog?: () => void;
}
```

- [ ] **Step 2: Destructure `onNavigateToLog` in the function signature**

In the function signature (around line 63-75), add `onNavigateToLog` to the destructured props:

Find:
```typescript
export function ReviewSidePanel({
  approvalId,
  approvalWorkflow,
  currentUserId,
  riskStatus,
  userRole,
  inherentScore,
  reviewedScore,
  reviewedProbability: initialReviewedProbability,
  reviewedImpact: initialReviewedImpact,
  token,
  onActionComplete,
}: ReviewSidePanelProps) {
```

Replace with:
```typescript
export function ReviewSidePanel({
  approvalId,
  approvalWorkflow,
  currentUserId,
  riskStatus,
  userRole,
  inherentScore,
  reviewedScore,
  reviewedProbability: initialReviewedProbability,
  reviewedImpact: initialReviewedImpact,
  token,
  onActionComplete,
  onNavigateToLog,
}: ReviewSidePanelProps) {
```

- [ ] **Step 3: Pass `onNavigateToLog` from the parent page**

In `frontend/src/app/(app)/risk/register/new/page.tsx`, find the `<ReviewSidePanel` usage (around line 2977-2993):

```typescript
<ReviewSidePanel
  approvalId={approvalId}
  approvalWorkflow={approvalWorkflow}
  currentUserId={user?.id || ""}
  riskStatus={riskStatus}
  userRole={user?.role || ""}
  inherentScore={currentScoreSemantics.inherent.score}
  reviewedScore={reviewerScoreData?.reviewedScore}
  reviewedProbability={reviewerScoreData?.reviewedProbability}
  reviewedImpact={reviewerScoreData?.reviewedImpact}
  token={token || undefined}
  onActionComplete={() => {
    if (riskId) {
      loadRiskData(riskId);
    }
  }}
/>
```

Replace with:

```typescript
<ReviewSidePanel
  approvalId={approvalId}
  approvalWorkflow={approvalWorkflow}
  currentUserId={user?.id || ""}
  riskStatus={riskStatus}
  userRole={user?.role || ""}
  inherentScore={currentScoreSemantics.inherent.score}
  reviewedScore={reviewerScoreData?.reviewedScore}
  reviewedProbability={reviewerScoreData?.reviewedProbability}
  reviewedImpact={reviewerScoreData?.reviewedImpact}
  token={token || undefined}
  onActionComplete={() => {
    if (riskId) {
      loadRiskData(riskId);
    }
  }}
  onNavigateToLog={() => setActiveView("log")}
/>
```

- [ ] **Step 4: Verify both files have zero LSP diagnostics**

Run LSP diagnostics on:
- `frontend/src/components/risk/review-side-panel.tsx`
- `frontend/src/app/(app)/risk/register/new/page.tsx`

Confirm zero errors on both.

---

### Task 3: Replace Status Badge with Stepper in ReviewSidePanel

**Files:**
- Modify: `frontend/src/components/risk/review-side-panel.tsx`
- Reference: `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx` lines 562-649 (timeline rendering pattern)
- Reference: `frontend/src/lib/approval-stepper-view-model.ts` (created in Task 1)

- [ ] **Step 1: Add imports for the stepper**

In `frontend/src/components/risk/review-side-panel.tsx`, find the existing imports at the top of the file.

Add to the lucide-react import (around line 10-17):

Find:
```typescript
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  UserCheck,
  Shield,
} from "lucide-react";
```

Replace with:
```typescript
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  UserCheck,
  Shield,
  CheckCircle2,
  Circle,
  XCircle,
  History,
} from "lucide-react";
```

Add the view model import after the existing imports (after line 32):

```typescript
import {
  buildApprovalStepperViewModel,
  type ApprovalStepperNode,
  type StepperNodeState,
} from "@/lib/approval-stepper-view-model";
```

- [ ] **Step 2: Delete the `getStatusBadge` function**

In `frontend/src/components/risk/review-side-panel.tsx`, find and delete the entire `getStatusBadge` function (around lines 201-242):

```typescript
  const getStatusBadge = () => {
    switch (riskStatus) {
      case "in_review":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-500/20"
          >
            Sedang Ditinjau
          </Badge>
        );
      case "in_approval":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
          >
            Menunggu Persetujuan
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20"
          >
            Disetujui
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-500/20"
          >
            Ditolak
          </Badge>
        );
      default:
        return null;
    }
  };
```

Delete this entire function. It is replaced by the stepper.

- [ ] **Step 3: Add stepper state class map and build the stepper nodes**

After the `isRejected` constant (around line 101), add the stepper class map:

```typescript
  const stepperStateClassName: Record<StepperNodeState, string> = {
    completed: "border-success/20 bg-success/10 text-success",
    current: "border-primary/20 bg-primary/[0.06] text-primary",
    upcoming: "border-border bg-muted/40 text-muted-foreground",
    rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  };

  const stepperNodes = approvalWorkflow
    ? buildApprovalStepperViewModel(approvalWorkflow, riskStatus, currentUserId)
    : [];
```

- [ ] **Step 4: Replace the status badge rendering with the stepper UI**

In the `return` statement (around line 585-587), find:

```typescript
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{getStatusBadge()}</div>
```

Replace with:

```typescript
  return (
    <div className="space-y-4">
      {stepperNodes.length > 0 && (
        <div className="rounded-xl border border-border/20 bg-card p-4">
          <div className="space-y-0">
            {stepperNodes.map((node, index) => {
              const isLast = index === stepperNodes.length - 1;
              const isCompleted = node.state === "completed";
              const isCurrent = node.state === "current";
              const isUpcoming = node.state === "upcoming";
              const isRejectedNode = node.state === "rejected";

              return (
                <div
                  key={node.label}
                  className={cn("flex gap-3", isUpcoming && "opacity-75")}
                >
                  <div className="flex flex-col items-center">
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-success/30 bg-success/20">
                          <CheckCircle2 className="size-4 text-success" />
                        </div>
                      ) : isCurrent ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                          <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                        </div>
                      ) : isRejectedNode ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-destructive/30 bg-destructive/20">
                          <XCircle className="size-4 text-destructive" />
                        </div>
                      ) : (
                        <div className="flex size-6 items-center justify-center rounded-full border border-border bg-muted">
                          <Circle className="size-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 flex-1 min-h-4",
                          isCompleted
                            ? "bg-success"
                            : isCurrent
                              ? "bg-primary/30"
                              : isRejectedNode
                                ? "bg-destructive/30"
                                : "bg-border",
                        )}
                      />
                    )}
                  </div>

                  <div className={cn("min-w-0 flex-1", !isLast ? "pb-5" : "pb-0")}>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-none">
                          {node.label}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          ·
                        </span>
                        <p className="truncate text-xs text-muted-foreground">
                          {node.actorName}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-2 text-[10px] font-semibold",
                            stepperStateClassName[node.state],
                          )}
                        >
                          {node.state === "completed"
                            ? "Selesai"
                            : node.state === "current"
                              ? node.isActionOwner
                                ? "Giliran Anda"
                                : "Aktif"
                              : node.state === "rejected"
                                ? "Ditolak"
                                : "Menunggu"}
                        </Badge>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {node.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {onNavigateToLog && (
            <div className="mt-3 flex justify-end border-t border-border/10 pt-3">
              <button
                type="button"
                onClick={onNavigateToLog}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <History className="size-3" />
                Lihat riwayat →
              </button>
            </div>
          )}
        </div>
      )}
```

Note: The rest of the JSX (the two Cards for reviewer and approval panels) stays exactly as-is after this block. The `<div className="flex justify-end">{getStatusBadge()}</div>` line is deleted and not replaced inline — the stepper block above replaces it.

- [ ] **Step 5: Verify the file has zero LSP diagnostics**

Run LSP diagnostics on `frontend/src/components/risk/review-side-panel.tsx` and confirm zero errors.

---

### Task 4: Verify End-to-End Rendering

**Files:**
- Read: `frontend/src/components/risk/review-side-panel.tsx` (final state)
- Read: `frontend/src/lib/approval-stepper-view-model.ts` (final state)
- Read: `frontend/src/app/(app)/risk/register/new/page.tsx` (final state, around `ReviewSidePanel` usage)

- [ ] **Step 1: Run LSP diagnostics on all modified files**

Run LSP diagnostics on:
- `frontend/src/lib/approval-stepper-view-model.ts`
- `frontend/src/components/risk/review-side-panel.tsx`
- `frontend/src/app/(app)/risk/register/new/page.tsx`

Confirm zero errors on all three files.

- [ ] **Step 2: Run the frontend build**

```bash
cd frontend && npm run build
```

Confirm exit code 0 with no TypeScript or build errors.

- [ ] **Step 3: Visual verification checklist**

Verify the following by reading the final source:

1. `getStatusBadge()` function is fully removed from `review-side-panel.tsx`
2. `<div className="flex justify-end">{getStatusBadge()}</div>` is fully removed
3. The stepper renders 3 nodes: "Diajukan", "Ditinjau", "Persetujuan"
4. Each node has icon + label + actor name + badge + description
5. Connector lines exist between nodes with correct state-based colors
6. "Lihat riwayat →" link exists below the stepper with `History` icon
7. The `onNavigateToLog` prop is passed from the parent page calling `setActiveView("log")`
8. The two existing Cards (Penilaian Reviewer + Persetujuan Risiko) are unchanged
9. The `Badge` import is still present (used by stepper badges and panel badges)
10. No `as any`, `@ts-ignore`, or `@ts-expect-error` anywhere in changed code
