import type { MitigationTask, Risk } from "./risk";
import type { RiskEvent } from "./risk-event";

/** Period inputs reconstructed and access-scoped by /reports/quarterly. */
export type QuarterlyRisk = Partial<Risk> & {
  id: string;
  title: string;
  organizationId: string;
  archivedInPeriod?: boolean;
};
export type QuarterlyTask = MitigationTask & {
  organizationId: string;
  versionGroupId: string;
};
export interface QuarterlyReport {
  cycle: string;
  comparisonCycle: string;
  generatedAt: string;
  dataUpdatedAt?: string | null;
  warnings: string[];
  snapshotHash?: string;
  organizations: { id: string; name: string }[];
  risks: QuarterlyRisk[];
  previousRisks: QuarterlyRisk[];
  tasks: QuarterlyTask[];
  previousTasks?: QuarterlyTask[];
  events: (RiskEvent & { hasLinkedRisks?: boolean })[];
}

export interface QuarterlyReportOverview {
  cycle: string;
  comparisonCycle: string;
  generatedAt: string;
  dataUpdatedAt?: string | null;
  warnings: string[];
  snapshotHash?: string;
  summary: QuarterlyEvaluationSummary;
  previousSummary: QuarterlyEvaluationSummary;
  movement: {
    up: number;
    down: number;
    stable: number;
    new: number;
    absent: number;
  };
  hasRisks: boolean;
  taskCounts: {
    reported: number;
    pending: number;
    overdue: number;
    not_reported: number;
    skipped: number;
    total: number;
  };
  recentEvents: QuarterlyReportEventPreview[];
  severityCounts: Record<"low" | "medium" | "high" | "extreme", number>;
  units: QuarterlyReportUnitOverview[];
}

export interface QuarterlyEvaluationSummary {
  total: number;
  appetite: { above: number; total: number; rate: number | null };
  target: {
    achieved: number;
    eligible: number;
    unavailable: number;
    rate: number | null;
  };
  monitoring: { final: number; total: number; rate: number | null };
  mitigation: {
    reported: number;
    total: number;
    rate: number | null;
    overdue: number;
  };
  events: {
    total: number;
    knownLoss: number;
    knownLossCount: number;
    unknownLoss: number;
    unlinked: number;
  };
  targetsAvailable: number;
  evidenceAvailable: number;
}

export interface QuarterlyReportEventPreview {
  id: string;
  code: string;
  description: string;
  occurredAt: string;
  organizationName: string;
  postResponseCondition: string;
  severity: string;
}

export interface QuarterlyReportUnitOverview {
  id: string;
  name: string;
  hasData: boolean;
  attentionCount: number;
  summary: QuarterlyEvaluationSummary;
}
