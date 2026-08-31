import type {
  WorkingPaperRosterPreview,
  WorkingPaperRosterStatus,
} from "@/types/working-paper";

export interface RosterDecision {
  versionGroupId: string;
  included: boolean;
}

export interface RosterSummary {
  eligibleCount: number;
  includedCount: number;
  excludedCount: number;
  notStartedCount: number;
  inProgressCount: number;
  finalizedCount: number;
}

export const ROSTER_STATUS_LABELS: Record<WorkingPaperRosterStatus, string> = {
  not_started: "Belum dimulai",
  in_progress: "Sedang berjalan",
  finalized: "Selesai",
};

export const ROSTER_STATUS_BADGE_CLASSES: Record<WorkingPaperRosterStatus, string> = {
  not_started:
    "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300",
  in_progress:
    "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  finalized:
    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export function buildInitialRosterDecisions(
  preview: WorkingPaperRosterPreview,
): RosterDecision[] {
  return preview.entries.map((entry) => ({
    versionGroupId: entry.versionGroupId,
    included: true,
  }));
}

export function summarizeRosterDecisions(
  preview: WorkingPaperRosterPreview,
  decisions: RosterDecision[],
): RosterSummary {
  const decisionMap = new Map(
    decisions.map((d) => [d.versionGroupId, d]),
  );

  let includedCount = 0;
  let excludedCount = 0;
  let notStartedCount = 0;
  let inProgressCount = 0;
  let finalizedCount = 0;

  for (const entry of preview.entries) {
    const decision = decisionMap.get(entry.versionGroupId);
    if (!decision || !decision.included) {
      excludedCount++;
      continue;
    }
    includedCount++;
    if (entry.rosterStatus === "not_started") notStartedCount++;
    else if (entry.rosterStatus === "in_progress") inProgressCount++;
    else if (entry.rosterStatus === "finalized") finalizedCount++;
  }

  return {
    eligibleCount: preview.entries.length,
    includedCount,
    excludedCount,
    notStartedCount,
    inProgressCount,
    finalizedCount,
  };
}
