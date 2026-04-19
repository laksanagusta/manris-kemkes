export interface ApprovalHistory {
  id: string;
  action: "submitted" | "approved" | "rejected" | "returned";
  actorId: string;
  actorName: string;
  actorRole: string;
  comments: string;
  createdAt: string;
}

export interface RawApprovalHistory {
  id?: string;
  action?: "submitted" | "approved" | "rejected" | "returned";
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  comments?: string;
  createdAt?: string;
  ID?: string;
  Action?: "submitted" | "approved" | "rejected" | "returned";
  ActorID?: string;
  ActorName?: string;
  ActorRole?: string;
  Comments?: string;
  CreatedAt?: string;
}

function toApprovalHistory(item: RawApprovalHistory, index: number): ApprovalHistory {
  return {
    id: item.id || item.ID || `approval-${index}`,
    action: item.action || item.Action || "submitted",
    actorId: item.actorId || item.ActorID || "",
    actorName: item.actorName || item.ActorName || "-",
    actorRole: item.actorRole || item.ActorRole || "-",
    comments: item.comments || item.Comments || "",
    createdAt: item.createdAt || item.CreatedAt || new Date(0).toISOString(),
  };
}

function approvalHistorySignature(item: ApprovalHistory): string {
  return [
    item.action,
    item.actorId,
    item.actorName,
    item.actorRole,
    item.comments,
    item.createdAt,
  ].join("::");
}

function approvalHistoryTimestamp(item: ApprovalHistory): number {
  const value = Date.parse(item.createdAt);
  return Number.isNaN(value) ? 0 : value;
}

export function normalizeApprovalHistoryItems(items: RawApprovalHistory[] = []): ApprovalHistory[] {
  return items.map(toApprovalHistory).filter((item) => Boolean(item.id));
}

export function mergeApprovalHistories(
  ...historyGroups: ApprovalHistory[][]
): ApprovalHistory[] {
  const merged: ApprovalHistory[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const group of historyGroups) {
    for (const item of group) {
      const signature = approvalHistorySignature(item);
      if (seenIds.has(item.id) || seenSignatures.has(signature)) {
        continue;
      }

      seenIds.add(item.id);
      seenSignatures.add(signature);
      merged.push(item);
    }
  }

  return merged.sort((left, right) => {
    const timestampDiff = approvalHistoryTimestamp(right) - approvalHistoryTimestamp(left);
    if (timestampDiff !== 0) {
      return timestampDiff;
    }

    return left.id.localeCompare(right.id);
  });
}
