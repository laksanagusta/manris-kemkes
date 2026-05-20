import type { DraftApprovalLineMember } from "@/lib/risk-approval-line";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";

export type RiskRegisterPayloadMitigation = {
  action: string;
  owner: string;
  treatmentOwnerId?: string;
  dueDate?: string;
  mitigationType?: string;
  activityStage?: string;
  expectedOutput?: string;
  quantitativeTarget?: string;
  supportingUnit?: string;
  resourcesRequired?: string;
  contingencyPlan?: string;
  potentialObstacle?: string;
  costBenefitNote?: string;
  isBreakthroughActivity?: boolean;
  isExistingControl?: boolean;
};

export type RiskRegisterPayloadData = {
  title: string;
  description: string;
  category?: string;
  organizationId?: string;
  roId?: string;
  causes?: Array<{ text: string }>;
  impacts?: Array<{ text: string }>;
  riskSource?: string;
  controllability?: string;
  existingControl?: string;
  controlEffectiveness?: string;
  probability: number;
  impact: number;
  weight: number;
  riskPriority: number;
  riskAppetite?: string;
  treatmentOption?: string;
  nextReviewDate?: string;
  targetProbability: number;
  targetImpact: number;
  targetWeight: number;
  mitigations?: RiskRegisterPayloadMitigation[];
};

export type RiskRegisterPayloadContext = {
  assessmentCycle: string;
  userRole?: string;
  userOrganizationId?: string | null;
  reviewerId?: string;
  reviewerOption?: UserPickerOption | null;
  selectedApprovalLine?: DraftApprovalLineMember[];
};

export function buildRiskRegisterPayload(
  data: RiskRegisterPayloadData,
  status: string,
  context: RiskRegisterPayloadContext,
) {
  const orgId =
    context.userRole === "unit" && context.userOrganizationId
      ? context.userOrganizationId
      : data.organizationId && data.organizationId.trim() !== ""
        ? data.organizationId
        : null;

  const selectedApprovalLine = (context.selectedApprovalLine ?? []).filter(
    (member) => member.id,
  );

  return {
    title: data.title,
    description: data.description,
    category: data.category,
    status,
    organizationId: orgId,
    draftApprovalLine: [
      ...(context.reviewerId
        ? [
            {
              id: context.reviewerId,
              name: context.reviewerOption?.name || "Reviewer",
              type: "review" as const,
            },
          ]
        : []),
      ...selectedApprovalLine
        .filter((member) => member.id !== context.reviewerId)
        .map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          type: "approval" as const,
        })),
    ],
    cause: (data.causes || [])
      .map((cause) => cause.text)
      .filter((text) => text.trim()),
    riskSource: data.riskSource,
    controllability: data.controllability,
    impactDesc: (data.impacts || [])
      .map((impactItem) => impactItem.text)
      .filter((text) => text.trim()),
    existingControl: data.existingControl,
    controlEffectiveness: data.controlEffectiveness,
    probability: data.probability,
    impact: data.impact,
    weight: data.weight,
    riskPriority: data.riskPriority,
    riskAppetite: data.riskAppetite,
    treatmentOption: data.treatmentOption,
    nextReviewDate:
      data.nextReviewDate && data.nextReviewDate.trim() !== ""
        ? data.nextReviewDate
        : null,
    targetProbability: data.targetProbability,
    targetImpact: data.targetImpact,
    targetWeight: data.targetWeight,
    assessmentCycle: context.assessmentCycle,
    mitigations: (data.mitigations || []).map((mitigation) => ({
      action: mitigation.action,
      owner: mitigation.owner,
      ...(mitigation.treatmentOwnerId
        ? { ownerUserId: mitigation.treatmentOwnerId }
        : {}),
      dueDate:
        mitigation.dueDate && mitigation.dueDate.trim() !== ""
          ? mitigation.dueDate
          : null,
      targetCost: 0,
      mitigationType: mitigation.mitigationType,
      activityStage: mitigation.activityStage || "",
      expectedOutput: mitigation.expectedOutput || "",
      quantitativeTarget: mitigation.quantitativeTarget || "",
      supportingUnit: mitigation.supportingUnit || "",
      resourcesRequired: mitigation.resourcesRequired || "",
      contingencyPlan: mitigation.contingencyPlan || "",
      potentialObstacle: mitigation.potentialObstacle || "",
      costBenefitNote: mitigation.costBenefitNote || "",
      isBreakthroughActivity: mitigation.isBreakthroughActivity ?? false,
      isExistingControl: mitigation.isExistingControl ?? false,
    })),
    roId: data.roId || undefined,
  };
}
