export type ReviewWorkflowStage = "review" | "approval" | "final" | "unknown";

type PanelActivationInput = {
  workflowStage: ReviewWorkflowStage;
  currentApproverUserId?: string | null;
  currentUserId?: string;
  userRole?: string;
};

function isCurrentApprovalAssignee({
  currentApproverUserId,
  currentUserId,
}: Pick<PanelActivationInput, "currentApproverUserId" | "currentUserId">): boolean {
  if (!currentApproverUserId) return true;
  return currentApproverUserId === currentUserId;
}

export function canActivateReviewerPanel({
  workflowStage,
  currentApproverUserId,
  currentUserId,
  userRole,
}: PanelActivationInput): boolean {
  return (
    workflowStage === "review" &&
    userRole === "reviewer" &&
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
