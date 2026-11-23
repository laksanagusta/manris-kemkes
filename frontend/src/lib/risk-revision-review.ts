import { normalizeRiskSource, riskSourceLabels } from "./risk-source";
import { diffRiskSubstance, treatmentOptionLabels, type RiskSubstanceSource } from "./risk-assessment-substance";
import { riskCategoryLabels } from "./risk";
import type { RiskRegisterPayloadMitigation } from "./risk-register-payload";

type RevisionPlan = RiskRegisterPayloadMitigation & { ownerUserId?: string };

type RevisionProfile = Omit<RiskSubstanceSource, "category" | "mitigations"> & {
  category?: string | null;
  riskOwnerId?: string;
  riskOwnerName?: string;
  probability?: number;
  impact?: number;
  currentAssessment?: { probability: number; impact: number };
  nextReviewDate?: string | null;
  mitigations?: RevisionPlan[];
};

export type RiskRevisionChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export function canSubmitRiskRevision(changes: RiskRevisionChange[] | null, reason: string): boolean {
  return Boolean(changes?.length) && reason.trim().length >= 10 && reason.length <= 1000;
}

const valueLabels: Record<string, Record<string, string>> = {
  category: riskCategoryLabels,
  treatmentOption: treatmentOptionLabels,
  riskSource: riskSourceLabels,
  controllability: { C: "Dapat dikendalikan", UC: "Tidak dapat dikendalikan" },
  controlEffectiveness: { efektif: "Efektif", tidak_efektif: "Tidak efektif" },
};

const planTypeLabels: Record<string, string> = {
  reduce_probability: "Turunkan probabilitas",
  reduce_impact: "Turunkan dampak",
  reduce_both: "Turunkan probabilitas dan dampak",
};

function formatValue(field: string, value: unknown): string {
  if (field === "mitigations") {
    return (value as RevisionPlan[]).map(plan => [
      plan.action,
      plan.owner,
      plan.mitigationType && (planTypeLabels[plan.mitigationType] ?? plan.mitigationType),
      plan.executionScheduleText,
      plan.dueDate,
      plan.frequency,
      plan.recurringInterval,
      plan.reportDay != null && `Hari laporan ${plan.reportDay}`,
      plan.reportDate != null && `Tanggal laporan ${plan.reportDate}`,
      plan.targetCost ? `Rp${plan.targetCost.toLocaleString("id-ID")}` : "",
    ].filter(Boolean).join(" · ")).join("\n") || "—";
  }
  if (Array.isArray(value)) return value.join("\n") || "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value) return valueLabels[field]?.[value] ?? value;
  return "—";
}

function normalizeProfile(profile: RevisionProfile): RiskSubstanceSource {
  const mitigations = profile.mitigations?.map(plan => ({
    ...plan,
    ownerUserId: plan.ownerUserId || plan.treatmentOwnerId,
    treatmentOwnerId: undefined,
    mitigationType: plan.mitigationType || "reduce_probability",
    targetCost: plan.targetCost ?? 0,
  }));
  return {
    ...profile,
    category: profile.category ?? "",
    riskSource: normalizeRiskSource(profile.riskSource),
    controllability: profile.controllability === "UC" ? "UC" : "C",
    targetProbability: profile.targetProbability ?? 0,
    targetImpact: profile.targetImpact ?? 0,
    mitigations,
  };
}

export function getRiskRevisionChanges(previous: RevisionProfile, candidate: RevisionProfile): RiskRevisionChange[] {
  const changes = diffRiskSubstance(normalizeProfile(previous), normalizeProfile(candidate));
  const additionalFields = [
    { field: "probability", label: "Probabilitas", before: previous.currentAssessment?.probability ?? previous.probability ?? 0, after: candidate.probability ?? 0 },
    { field: "impact", label: "Dampak penilaian", before: previous.currentAssessment?.impact ?? previous.impact ?? 0, after: candidate.impact ?? 0 },
    { field: "nextReviewDate", label: "Jadwal pelaksanaan", before: previous.nextReviewDate?.trim() ?? "", after: candidate.nextReviewDate?.trim() ?? "" },
  ].filter(({ before, after }) => before !== after);

  if ((previous.riskOwnerId ?? "") !== (candidate.riskOwnerId ?? "")) {
    additionalFields.push({
      field: "riskOwnerId",
      label: "Pemilik Risiko",
      before: previous.riskOwnerName ?? "",
      after: candidate.riskOwnerName ?? "",
    });
  }

  return [...changes, ...additionalFields].map(({ field, label, before, after }) => ({
    field,
    label,
    before: formatValue(field, before),
    after: formatValue(field, after),
  }));
}
