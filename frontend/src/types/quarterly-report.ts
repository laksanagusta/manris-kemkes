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
