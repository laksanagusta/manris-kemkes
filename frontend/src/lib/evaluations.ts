import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

export const evaluationStatusLabel: Record<EvaluationStatus, string> = {
  draft: "Draft",
  final: "Final",
};

export type EvaluationFilter = {
  search?: string;
  status?: EvaluationStatus | "all";
  period?: string;
  organizationId?: string;
};

function normalize(value: string | undefined | null) {
  return (value || "").trim().toLowerCase();
}

function matchesSearch(evaluation: Evaluation, search: string) {
  if (!search) return true;

  const haystack = [
    evaluation.id,
    evaluation.organizationId,
    evaluation.code,
    evaluation.period,
    evaluation.templateName || "",
    evaluation.reportNumber,
    evaluation.assignmentLetterNumber,
    evaluation.monitoringDateRange,
    evaluation.unitCode,
    evaluation.unitLocation,
    evaluation.unitAddress,
    evaluation.unitEselonI,
    evaluation.unitLeaderName,
    evaluation.teamCoordinator,
    evaluation.teamLead,
    evaluation.teamMembers,
    evaluation.problems,
    evaluation.recommendations,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

export function isEvaluationEditable(evaluation: Evaluation) {
  return evaluation.status === "draft";
}

export function filterEvaluations(
  evaluations: Evaluation[],
  filter: EvaluationFilter = {},
) {
  const search = normalize(filter.search);
  const status = filter.status && filter.status !== "all" ? filter.status : "";
  const period = normalize(filter.period);
  const organizationId = normalize(filter.organizationId);

  return evaluations.filter((evaluation) => {
    if (status && evaluation.status !== status) return false;
    if (period && normalize(evaluation.period) !== period) return false;
    if (organizationId && normalize(evaluation.organizationId) !== organizationId) return false;
    return matchesSearch(evaluation, search);
  });
}
