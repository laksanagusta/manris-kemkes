export type ReviewWorkflowStage = "review" | "approval" | "final" | "unknown";

type ReviewSidePanelWorkflowLike = {
  currentStatus?: string | null;
  currentApproverUserId?: string | null;
  steps?: {
    approverUserId?: string | null;
    approverName?: string | null;
    stepType?: string | null;
    status?: string | null;
  }[];
};

type PanelActivationInput = {
  workflowStage: ReviewWorkflowStage;
  currentApproverUserId?: string | null;
  currentUserId?: string;
  /**
   * @deprecated Gating is now user_id-based. Kept optional for callers that still pass it; ignored.
   */
  userRole?: string;
};

type ReviewSidePanelWorkflowVisibilityInput = {
  approvalId?: string | null;
  approvalWorkflow?: ReviewSidePanelWorkflowLike | null;
  riskStatus: string;
  allowStatusFallbackWorkflowStage?: boolean;
};

function hasExplicitApprovalWorkflow(
  approvalWorkflow?: ReviewSidePanelWorkflowLike | null,
): boolean {
  if (!approvalWorkflow) {
    return false;
  }

  return Boolean(
    approvalWorkflow.currentStatus ||
      approvalWorkflow.currentApproverUserId ||
      (approvalWorkflow.steps?.length ?? 0) > 0,
  );
}

export function shouldRenderReviewSidePanelWorkflow({
  approvalId,
  approvalWorkflow,
  riskStatus,
  allowStatusFallbackWorkflowStage = true,
}: ReviewSidePanelWorkflowVisibilityInput): boolean {
  const hasWorkflowReference = Boolean(approvalId) || hasExplicitApprovalWorkflow(approvalWorkflow);

  if (!hasWorkflowReference) {
    return false;
  }

  if (hasExplicitApprovalWorkflow(approvalWorkflow)) {
    return true;
  }

  return allowStatusFallbackWorkflowStage && riskStatus === "draft";
}

function isCurrentApprovalAssignee({
  currentApproverUserId,
  currentUserId,
}: Pick<PanelActivationInput, "currentApproverUserId" | "currentUserId">): boolean {
  if (!currentApproverUserId || !currentUserId) return false;
  return currentApproverUserId === currentUserId;
}

export function canActivateReviewerPanel({
  workflowStage,
  currentApproverUserId,
  currentUserId,
}: PanelActivationInput): boolean {
  return (
    workflowStage === "review" &&
    isCurrentApprovalAssignee({ currentApproverUserId, currentUserId })
  );
}

export function canActivateApprovalPanel({
  workflowStage,
  currentApproverUserId,
  currentUserId,
}: PanelActivationInput): boolean {
  return (
    workflowStage === "approval" &&
    isCurrentApprovalAssignee({ currentApproverUserId, currentUserId })
  );
}
