export type ReviewWorkflowStage = "review" | "approval" | "final" | "unknown";

type PanelActivationInput = {
  workflowStage: ReviewWorkflowStage;
  currentApproverUserId?: string | null;
  currentUserId?: string;
  /**
   * @deprecated Gating is now user_id-based. Kept optional for callers that still pass it; ignored.
   */
  userRole?: string;
};

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
