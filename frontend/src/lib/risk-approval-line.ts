export type DraftApprovalLineMember = {
  id: string;
  name: string;
  type?: string;
  role?: string;
  subtitle?: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
};

export type ApprovalLineRow = {
  rowId: string;
  id: string;
  name: string;
  role?: string;
  subtitle?: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
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

export function createApprovalLineRow(
  member: Partial<ApprovalLineRow> = {},
  rowId = globalThis.crypto.randomUUID(),
): ApprovalLineRow {
  return {
    rowId,
    id: member.id ?? "",
    name: member.name ?? "",
    role: member.role ?? undefined,
    subtitle: member.subtitle ?? undefined,
    nip: member.nip ?? "",
    jabatan: member.jabatan ?? "",
    pangkat: member.pangkat ?? "",
  };
}

export function moveApprovalLineRows<T>(
  rows: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length
  ) {
    return [...rows];
  }

  const nextRows = [...rows];
  const [movedRow] = nextRows.splice(fromIndex, 1);

  nextRows.splice(toIndex, 0, movedRow);

  return nextRows;
}
