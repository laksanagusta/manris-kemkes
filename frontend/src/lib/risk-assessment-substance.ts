import type {
  ControlEffectiveness,
  Controllability,
  Risk,
  RiskCategory,
  RiskMitigation,
  RiskSource,
  TreatmentOption,
} from "@/types/risk";

export interface RiskSubstanceValues {
  title: string;
  description: string;
  category: RiskCategory | string;
  cause: string[];
  riskSource: RiskSource | string;
  controllability: string;
  impactDesc: string[];
  existingControl: string;
  controlEffectiveness: ControlEffectiveness | string;
  treatmentOption: TreatmentOption | string;
  mitigations: RiskMitigation[];
}

export interface RiskSubstanceDiff {
  field: keyof Omit<RiskSubstanceValues, "mitigations"> | "mitigations";
  label: string;
  before: unknown;
  after: unknown;
  changeType: "added" | "removed" | "modified";
}

export const treatmentOptionLabels: Record<string, string> = {
  avoid: "Menghindari Risiko",
  transfer: "Berbagi Risiko",
  mitigate: "Mitigasi",
  accept: "Menerima Risiko",
  menghindari: "Menghindari Risiko",
  berbagi: "Berbagi Risiko",
  mitigasi: "Mitigasi",
  menerima: "Menerima Risiko",
};

const substanceFieldLabels: Record<
  RiskSubstanceDiff["field"],
  string
> = {
  title: "Judul",
  description: "Deskripsi",
  category: "Kategori",
  cause: "Penyebab",
  riskSource: "Sumber Risiko",
  controllability: "Kontrollabilitas",
  impactDesc: "Dampak",
  existingControl: "Kontrol Eksisting",
  controlEffectiveness: "Efektivitas Kontrol",
  treatmentOption: "Pilihan Penanganan",
  mitigations: "Rencana Mitigasi",
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUuid(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : undefined;
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeTreatmentOption(value: unknown): string {
  const raw = normalizeText(value).toLowerCase();
  switch (raw) {
    case "avoid":
    case "menghindari":
    case "menghindari risiko":
      return "avoid";
    case "transfer":
    case "berbagi":
    case "berbagi risiko":
      return "transfer";
    case "mitigate":
    case "mitigasi":
    case "mitigasi risiko":
      return "mitigate";
    case "accept":
    case "terima":
    case "menerima":
    case "menerima risiko":
      return "accept";
    default:
      return raw;
  }
}

function normalizeMitigation(value: Partial<RiskMitigation> | undefined): RiskMitigation {
  return {
    id: normalizeUuid(value?.id),
    action: normalizeText(value?.action),
    owner: normalizeText(value?.owner),
    ownerUserId: value?.ownerUserId,
    treatmentOwnerId: value?.treatmentOwnerId,
    externalPicId: value?.externalPicId,
    dueDate: normalizeText(value?.dueDate),
    frequency: value?.frequency,
    recurringInterval: value?.recurringInterval,
    reportDay: value?.reportDay,
    reportDate: value?.reportDate,
    executionScheduleText: normalizeText(value?.executionScheduleText),
    targetCost: value?.targetCost,
    mitigationType: value?.mitigationType,
    activityStage: normalizeText(value?.activityStage),
    expectedOutput: normalizeText(value?.expectedOutput),
    quantitativeTarget: normalizeText(value?.quantitativeTarget),
    supportingUnit: normalizeText(value?.supportingUnit),
    resourcesRequired: normalizeText(value?.resourcesRequired),
    contingencyPlan: normalizeText(value?.contingencyPlan),
    potentialObstacle: normalizeText(value?.potentialObstacle),
    costBenefitNote: normalizeText(value?.costBenefitNote),
    isBreakthroughActivity: Boolean(value?.isBreakthroughActivity),
    isExistingControl: Boolean(value?.isExistingControl),
  };
}

function normalizeMitigationList(value: unknown): RiskMitigation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeMitigation(item as Partial<RiskMitigation>));
}

function serializeMitigation(value: RiskMitigation): string {
  return JSON.stringify({
    action: normalizeText(value.action),
    owner: normalizeText(value.owner),
    ownerUserId: value.ownerUserId ?? "",
    treatmentOwnerId: value.treatmentOwnerId ?? "",
    externalPicId: value.externalPicId ?? "",
    dueDate: normalizeText(value.dueDate),
    frequency: value.frequency ?? "",
    recurringInterval: value.recurringInterval ?? "",
    reportDay: value.reportDay ?? null,
    reportDate: value.reportDate ?? null,
    executionScheduleText: normalizeText(value.executionScheduleText),
    targetCost: value.targetCost ?? null,
    mitigationType: value.mitigationType ?? "",
    activityStage: normalizeText(value.activityStage),
    expectedOutput: normalizeText(value.expectedOutput),
    quantitativeTarget: normalizeText(value.quantitativeTarget),
    supportingUnit: normalizeText(value.supportingUnit),
    resourcesRequired: normalizeText(value.resourcesRequired),
    contingencyPlan: normalizeText(value.contingencyPlan),
    potentialObstacle: normalizeText(value.potentialObstacle),
    costBenefitNote: normalizeText(value.costBenefitNote),
    isBreakthroughActivity: Boolean(value.isBreakthroughActivity),
    isExistingControl: Boolean(value.isExistingControl),
  });
}

function mitigationListsEqual(a: RiskMitigation[], b: RiskMitigation[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, index) => serializeMitigation(item) === serializeMitigation(b[index]));
}

function stringListsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, index) => item === b[index]);
}

function normalizeSubstanceValues(
  value: Partial<Risk> | Partial<RiskSubstanceValues> | null | undefined,
): RiskSubstanceValues {
  const mitigations = normalizeMitigationList(
    "mitigations" in (value ?? {}) ? (value as Partial<Risk>).mitigations : undefined,
  );
  const singleMitigation = (value as Partial<Risk> | undefined)?.mitigation;

  return {
    title: normalizeText(value?.title),
    description: normalizeText(value?.description),
    category: normalizeText(value?.category),
    cause: normalizeStringList(value?.cause),
    riskSource: normalizeText(value?.riskSource),
    controllability: normalizeText(value?.controllability),
    impactDesc: normalizeStringList(value?.impactDesc),
    existingControl: normalizeText(value?.existingControl),
    controlEffectiveness: normalizeText(value?.controlEffectiveness),
    treatmentOption: normalizeTreatmentOption(value?.treatmentOption),
    mitigations:
      mitigations.length > 0
        ? mitigations
        : singleMitigation
          ? [normalizeMitigation(singleMitigation)]
          : [],
  };
}

export function buildSubstanceDefaults(
  risk: Partial<Risk> | null | undefined,
): RiskSubstanceValues {
  return normalizeSubstanceValues(risk);
}

export function diffRiskSubstance(
  previous: Partial<Risk> | null | undefined,
  candidate:
    | Partial<Risk>
    | Partial<RiskSubstanceValues>
    | RiskSubstanceValues
    | null
    | undefined,
): RiskSubstanceDiff[] {
  const previousValues = normalizeSubstanceValues(previous);
  const candidateValues = normalizeSubstanceValues(candidate);

  const diffs: RiskSubstanceDiff[] = [];

  (Object.entries(substanceFieldLabels) as Array<
    [RiskSubstanceDiff["field"], string]
  >).forEach(([field, label]) => {
    const before = previousValues[field];
    const after = candidateValues[field];

    let isDifferent = false;
    if (field === "cause" || field === "impactDesc") {
      isDifferent = !stringListsEqual(before as string[], after as string[]);
    } else if (field === "mitigations") {
      isDifferent = !mitigationListsEqual(
        before as RiskMitigation[],
        after as RiskMitigation[],
      );
    } else {
      isDifferent = before !== after;
    }

    if (!isDifferent) {
      return;
    }

    const changeType =
      before === undefined || before === null || before === ""
        ? "added"
        : after === undefined || after === null || after === ""
          ? "removed"
          : "modified";

    diffs.push({
      field,
      label,
      before,
      after,
      changeType,
    });
  });

  return diffs;
}

export function needsSubstanceChangeReason(
  previous: Partial<Risk> | null | undefined,
  values: Partial<RiskSubstanceValues> | null | undefined,
  enabled: boolean,
): boolean {
  if (!enabled) {
    return false;
  }

  return diffRiskSubstance(previous, values).length > 0;
}

export function buildSubstancePayload(
  previous: Partial<Risk> | null | undefined,
  options: {
    enabled: boolean;
    values: Partial<RiskSubstanceValues> | null | undefined;
  },
): Partial<Risk> {
  if (!options.enabled) {
    return { ...(previous ?? {}) };
  }

  const nextValues = normalizeSubstanceValues(options.values);

  return {
    ...previous,
    title: nextValues.title,
    description: nextValues.description,
    category: nextValues.category as RiskCategory,
    cause: nextValues.cause,
    riskSource: nextValues.riskSource as RiskSource,
    controllability: nextValues.controllability as Controllability,
    impactDesc: nextValues.impactDesc,
    existingControl: nextValues.existingControl,
    controlEffectiveness: nextValues.controlEffectiveness as ControlEffectiveness,
    treatmentOption: nextValues.treatmentOption as TreatmentOption,
    mitigations: nextValues.mitigations.map(({ id: _omitId, ...mitigation }) => mitigation),
  };
}

export function formatSubstanceDiffSummary(
  previous: Partial<Risk> | null | undefined,
  candidate:
    | Partial<Risk>
    | Partial<RiskSubstanceValues>
    | RiskSubstanceValues
    | null
    | undefined,
): string {
  const diffs = diffRiskSubstance(previous, candidate);

  if (diffs.length === 0) {
    return "Tidak ada perubahan substansi";
  }

  return diffs.map((diff) => diff.label).join(", ");
}
