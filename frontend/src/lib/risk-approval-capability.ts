export interface RiskApprovalCapabilities {
  riskApprovalWorkflowEnabled: boolean;
}

export interface RiskApprovalCapabilityBehavior {
  riskApprovalWorkflowEnabled: boolean;
  showsApprovalLineEditor: boolean;
  submitsForApproval: boolean;
  requiresReviewerSelection: boolean;
  requiresApprovalLineSelection: boolean;
  usesDirectApprovalCopy: boolean;
}

export function getRiskApprovalCapabilityBehavior(
  capabilities: RiskApprovalCapabilities | null | undefined,
): RiskApprovalCapabilityBehavior {
  // Risk profile approval is intentionally disabled for the current flow.
  // Incident approval continues to use the separate approval module.
  const riskApprovalWorkflowEnabled = false;

  return {
    riskApprovalWorkflowEnabled,
    showsApprovalLineEditor: riskApprovalWorkflowEnabled,
    submitsForApproval: riskApprovalWorkflowEnabled,
    requiresReviewerSelection: riskApprovalWorkflowEnabled,
    requiresApprovalLineSelection: riskApprovalWorkflowEnabled,
    usesDirectApprovalCopy: !riskApprovalWorkflowEnabled,
  };
}
