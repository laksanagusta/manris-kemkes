import type { RiskWorkflowState } from "@/components/risk/review-side-panel";

export type StepperNodeState =
  | "completed"
  | "current"
  | "upcoming"
  | "rejected";

export type ApprovalStepperNode = {
  label: string;
  actorName: string;
  state: StepperNodeState;
  isActionOwner: boolean;
  description: string;
};

/**
 * Derives the workflow stage from approval and risk state.
 * Mirrors the logic in ReviewSidePanel but kept pure for testability.
 */
function deriveWorkflowStage(
  approvalWorkflow: RiskWorkflowState,
  riskStatus: string,
): "review" | "approval" | "final" | "unknown" {
  const workflowStatus = approvalWorkflow.currentStatus ?? null;
  const currentApproverUserId = approvalWorkflow.currentApproverUserId ?? null;
  const steps = approvalWorkflow.steps ?? [];

  if (
    workflowStatus === "approved" ||
    workflowStatus === "rejected" ||
    riskStatus === "approved"
  ) {
    return "final";
  }

  if (workflowStatus === "pending") {
    const activeStep =
      steps.find(
        (s) =>
          s.approverUserId &&
          s.approverUserId === currentApproverUserId &&
          s.status === "pending",
      ) ?? steps.find((s) => s.status === "pending");

    if (activeStep?.stepType === "review") return "review";
    if (activeStep?.stepType === "approval") return "approval";
  }

  if (riskStatus === "assessment_in_review") return "review";

  return "unknown";
}

export function buildApprovalStepperViewModel(
  approvalWorkflow: RiskWorkflowState,
  riskStatus: string,
  currentUserId?: string,
): ApprovalStepperNode[] {
  const steps = approvalWorkflow.steps ?? [];
  const workflowStage = deriveWorkflowStage(approvalWorkflow, riskStatus);

  const reviewStep = steps.find((s) => s.stepType === "review");
  const approvalSteps = steps.filter((s) => s.stepType === "approval");

  const submittedNode: ApprovalStepperNode = {
    label: "Diajukan",
    actorName: "Unit Pengelola",
    state: "completed",
    isActionOwner: false,
    description: "Risiko telah diajukan untuk ditinjau.",
  };

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

  // Generate dynamic approval nodes for each approver
  const approvalNodes: ApprovalStepperNode[] = approvalSteps.map((step) => {
    const actorName = step.approverName ?? "Pimpinan";

    const isMyTurn = Boolean(
      currentUserId &&
      step.approverUserId === currentUserId &&
      approvalWorkflow.currentApproverUserId === step.approverUserId,
    );
    const isActiveStep =
      workflowStage === "approval" &&
      approvalWorkflow.currentApproverUserId === step.approverUserId;

    if (step.status === "approved") {
      return {
        label: "Disetujui",
        actorName,
        state: "completed" as const,
        isActionOwner: false,
        description: "Risiko telah disetujui.",
      };
    }

    if (step.status === "rejected" && workflowStage === "final") {
      return {
        label: "Ditolak",
        actorName,
        state: "rejected" as const,
        isActionOwner: false,
        description: "Risiko ditolak pada tahap persetujuan.",
      };
    }

    if (isActiveStep) {
      return {
        label: "Persetujuan",
        actorName,
        state: "current" as const,
        isActionOwner: isMyTurn,
        description: isMyTurn
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
  });

  return [submittedNode, reviewNode, ...approvalNodes];
}
