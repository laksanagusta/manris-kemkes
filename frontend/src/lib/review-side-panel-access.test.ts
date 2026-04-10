import assert from "node:assert/strict";
import test from "node:test";

const accessLib = await import(new URL("./review-side-panel-access.ts", import.meta.url).href);

const { canActivateApprovalPanel } = accessLib as typeof import("./review-side-panel-access");

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
