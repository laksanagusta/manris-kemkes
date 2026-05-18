import assert from "node:assert/strict";
import test from "node:test";

const capabilityLib = await import(
  new URL("./risk-approval-capability", import.meta.url).href
);

const { getRiskApprovalCapabilityBehavior } = capabilityLib as typeof import("./risk-approval-capability");

test("getRiskApprovalCapabilityBehavior enables workflow-driven approval behavior when the backend capability is enabled", () => {
  assert.deepEqual(
    getRiskApprovalCapabilityBehavior({
      riskApprovalWorkflowEnabled: true,
    }),
    {
      riskApprovalWorkflowEnabled: true,
      showsApprovalLineEditor: true,
      submitsForApproval: true,
      requiresReviewerSelection: true,
      requiresApprovalLineSelection: true,
      usesDirectApprovalCopy: false,
    },
  );
});

test("getRiskApprovalCapabilityBehavior disables workflow-driven approval behavior when the backend capability is disabled", () => {
  assert.deepEqual(
    getRiskApprovalCapabilityBehavior({
      riskApprovalWorkflowEnabled: false,
    }),
    {
      riskApprovalWorkflowEnabled: false,
      showsApprovalLineEditor: false,
      submitsForApproval: false,
      requiresReviewerSelection: false,
      requiresApprovalLineSelection: false,
      usesDirectApprovalCopy: true,
    },
  );
});

test("getRiskApprovalCapabilityBehavior defaults validation requirements off when capabilities are absent", () => {
  assert.deepEqual(getRiskApprovalCapabilityBehavior(undefined), {
    riskApprovalWorkflowEnabled: false,
    showsApprovalLineEditor: false,
    submitsForApproval: false,
    requiresReviewerSelection: false,
    requiresApprovalLineSelection: false,
    usesDirectApprovalCopy: true,
  });
});
