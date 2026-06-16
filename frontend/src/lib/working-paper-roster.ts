import type {
  WorkingPaperRosterPreview,
  WorkingPaperRosterStatus,
} from "@/types/working-paper";

export interface RosterDecision {
  versionGroupId: string;
  included: boolean;
  exclusionReason: string;
}

export interface RosterSummary {
  eligibleCount: number;
  includedCount: number;
  excludedCount: number;
  finalizedCount: number;
  existingDraftCount: number;
  newDraftCount: number;
}

export const ROSTER_STATUS_LABELS: Record<WorkingPaperRosterStatus, string> = {
  finalized_result: "Hasil monitoring tersedia",
  existing_draft: "Draft monitoring tersedia",
  draft_will_be_created: "Draft monitoring akan dibuat",
};

export const ROSTER_STATUS_BADGE_CLASSES: Record<WorkingPaperRosterStatus, string> = {
  finalized_result:
    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  existing_draft:
    "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  draft_will_be_created:
    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export function buildInitialRosterDecisions(
  preview: WorkingPaperRosterPreview,
): RosterDecision[] {
  return preview.entries.map((entry) => ({
    versionGroupId: entry.versionGroupId,
    included: true,
    exclusionReason: "",
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
  let finalizedCount = 0;
  let existingDraftCount = 0;
  let newDraftCount = 0;

  for (const entry of preview.entries) {
    const decision = decisionMap.get(entry.versionGroupId);
    if (!decision || !decision.included) {
      excludedCount++;
      continue;
    }
    includedCount++;
    if (entry.rosterStatus === "finalized_result") finalizedCount++;
    else if (entry.rosterStatus === "existing_draft") existingDraftCount++;
    else if (entry.rosterStatus === "draft_will_be_created") newDraftCount++;
  }

  return {
    eligibleCount: preview.entries.length,
    includedCount,
    excludedCount,
    finalizedCount,
    existingDraftCount,
    newDraftCount,
  };
}

export function validateRosterDecisions(
  decisions: RosterDecision[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const decision of decisions) {
    if (!decision.included && !decision.exclusionReason.trim()) {
      errors[decision.versionGroupId] =
        "Alasan pengecualian wajib diisi.";
    }
  }
  return errors;
}
