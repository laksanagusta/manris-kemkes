import assert from "node:assert/strict";
import test from "node:test";

const accessLib = await import(new URL("./review-side-panel-access.ts", import.meta.url).href);

const { canActivateApprovalPanel, shouldRenderReviewSidePanelWorkflow } = accessLib as typeof import("./review-side-panel-access");

test("canActivateApprovalPanel allows any role for the current approval assignee", () => {
  assert.equal(
    canActivateApprovalPanel({
      workflowStage: "approval",
      currentApproverUserId: "user-1",
      currentUserId: "user-1",
      userRole: "unit",
    }),
    true,
  );

  assert.equal(
    canActivateApprovalPanel({
      workflowStage: "approval",
      currentApproverUserId: "user-2",
      currentUserId: "user-2",
      userRole: "reviewer",
    }),
    true,
  );
});

test("canActivateApprovalPanel still blocks users outside the active approval assignment", () => {
  assert.equal(
    canActivateApprovalPanel({
      workflowStage: "approval",
      currentApproverUserId: "user-1",
      currentUserId: "user-9",
      userRole: "pimpinan",
    }),
    false,
  );
});

test("canActivateApprovalPanel stays inactive outside the approval stage", () => {
  assert.equal(
    canActivateApprovalPanel({
      workflowStage: "review",
      currentApproverUserId: "user-1",
      currentUserId: "user-1",
      userRole: "unit",
    }),
    false,
  );
});

test("shouldRenderReviewSidePanelWorkflow preserves the legacy status fallback by default", () => {
  assert.equal(
    shouldRenderReviewSidePanelWorkflow({
      approvalId: "approval-1",
      approvalWorkflow: null,
      riskStatus: "assessment_in_review",
    }),
    true,
  );
});

test("shouldRenderReviewSidePanelWorkflow disables status-only review fallback when capability-aware callers opt out", () => {
  assert.equal(
    shouldRenderReviewSidePanelWorkflow({
      approvalId: "approval-1",
      approvalWorkflow: null,
      riskStatus: "assessment_in_review",
      allowStatusFallbackWorkflowStage: false,
    }),
    false,
  );
});

test("shouldRenderReviewSidePanelWorkflow still renders explicit pending workflows when status fallback is disabled", () => {
  assert.equal(
    shouldRenderReviewSidePanelWorkflow({
      approvalId: "approval-1",
      approvalWorkflow: {
        currentStatus: "pending",
        currentApproverUserId: "reviewer-1",
        steps: [
          {
            approverUserId: "reviewer-1",
            approverName: "Reviewer Satu",
            stepType: "review",
            status: "pending",
          },
        ],
      },
      riskStatus: "assessment_in_review",
      allowStatusFallbackWorkflowStage: false,
    }),
    true,
  );
});
