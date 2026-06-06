import type { MitigationType } from "@/types/risk";

export interface MitigationSearchItem {
  action: string;
  owner: string;
  dueDate: string;
  mitigationType?: MitigationType;
  activityStage?: string;
  expectedOutput?: string;
  quantitativeTarget?: string;
  supportingUnit?: string;
  resourcesRequired?: string;
  contingencyPlan?: string;
  potentialObstacle?: string;
  costBenefitNote?: string;
  executionScheduleText?: string;
  frequency?: string;
  recurringInterval?: string;
}

export interface IndexedMitigationSearchItem<T> {
  item: T;
  index: number;
}

const mitigationTypeLabels: Record<MitigationType, string> = {
  reduce_probability: "turunkan probabilitas",
  reduce_impact: "turunkan dampak",
  reduce_both: "turunkan probabilitas dan dampak",
};

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function collectMitigationSearchText(item: MitigationSearchItem) {
  return [
    item.action,
    item.owner,
    item.dueDate,
    item.activityStage,
    item.expectedOutput,
    item.quantitativeTarget,
    item.supportingUnit,
    item.resourcesRequired,
    item.contingencyPlan,
    item.potentialObstacle,
    item.costBenefitNote,
    item.executionScheduleText,
    item.frequency,
    item.recurringInterval,
    item.mitigationType ? mitigationTypeLabels[item.mitigationType] : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterMitigationItems<T extends MitigationSearchItem>(
  items: T[],
  query: string,
): Array<IndexedMitigationSearchItem<T>> {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items.map((item, index) => ({ item, index }));
  }

  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => collectMitigationSearchText(item).includes(normalizedQuery));
}
