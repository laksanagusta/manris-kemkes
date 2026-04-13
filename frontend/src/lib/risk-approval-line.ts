export type DraftApprovalLineMember = {
  id: string;
  name: string;
  type?: string;
  role?: string;
};

type ApprovalLineResolution = {
  reviewerId: string;
  approvalLine: DraftApprovalLineMember[];
};

export function resolveDraftApprovalLine(
  draftApprovalLine: DraftApprovalLineMember[] | null | undefined,
  reviewedBy?: string | null,
): ApprovalLineResolution {
  const members = Array.isArray(draftApprovalLine)
    ? draftApprovalLine.filter((member): member is DraftApprovalLineMember =>
        Boolean(member?.id && member?.name),
      )
    : [];

  if (members.length === 0) {
    return { reviewerId: "", approvalLine: [] };
  }

  const hasTypedMembers = members.some(
    (member) => member.type === "review" || member.type === "approval",
  );

  if (hasTypedMembers) {
    return {
      reviewerId:
        members.find((member) => member.type === "review")?.id ?? "",
      approvalLine: members.filter((member) => member.type === "approval"),
    };
  }

  const legacyReviewer = reviewedBy
    ? members.find((member) => member.id === reviewedBy) ?? members[0]
    : members[0];

  return {
    reviewerId: legacyReviewer?.id ?? "",
    approvalLine: members.filter((member) => member.id !== legacyReviewer?.id),
  };
}
