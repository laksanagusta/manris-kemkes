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
  const riskApprovalWorkflowEnabled = capabilities?.riskApprovalWorkflowEnabled === true;

  return {
    riskApprovalWorkflowEnabled,
    showsApprovalLineEditor: riskApprovalWorkflowEnabled,
    submitsForApproval: riskApprovalWorkflowEnabled,
    requiresReviewerSelection: riskApprovalWorkflowEnabled,
    requiresApprovalLineSelection: riskApprovalWorkflowEnabled,
    usesDirectApprovalCopy: !riskApprovalWorkflowEnabled,
  };
}
