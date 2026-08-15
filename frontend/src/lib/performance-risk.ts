import type {
  PerformanceRiskAttentionStatus,
  PerformanceRiskNode,
} from "../types/performance-risk.ts";

export type PerformanceRiskEmptyState =
  | "no_planning"
  | "no_linked_risk"
  | "has_unlinked_risk"
  | "ready";

export function sortPerformanceRiskNodes(nodes: PerformanceRiskNode[]) {
  return [...nodes].sort(
    (left, right) =>
      right.totalExposure - left.totalExposure ||
      right.highExtremeCount - left.highExtremeCount ||
      right.mitigationOverdue - left.mitigationOverdue ||
      left.roTitle.localeCompare(right.roTitle),
  );
}

export function statusLabelForPerformanceRisk(status: PerformanceRiskAttentionStatus) {
  switch (status) {
    case "critical":
      return "Kritis";
    case "watch":
      return "Perlu Pantauan";
    case "stable":
      return "Stabil";
    case "no_risk":
      return "Belum Ada Risiko";
  }
}

export function statusToneForPerformanceRisk(status: PerformanceRiskAttentionStatus) {
  switch (status) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "watch":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "stable":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "no_risk":
      return "border-border bg-muted text-muted-foreground";
  }
}

export function classifyPerformanceRiskEmptyState(summary: Pick<
  { totalRO: number; linkedRO: number; unlinkedRisks: number },
  "totalRO" | "linkedRO" | "unlinkedRisks"
>): PerformanceRiskEmptyState {
  if (summary.totalRO === 0) return "no_planning";
  if (summary.linkedRO === 0) return "no_linked_risk";
  if (summary.unlinkedRisks > 0) return "has_unlinked_risk";
  return "ready";
}
