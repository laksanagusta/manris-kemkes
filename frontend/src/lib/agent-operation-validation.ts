import type { AgentOperation } from "../types/agent.ts";
import { validateMitigationReportForm } from "./validation/reporting.ts";

export function agentOperationReviewValues(operation: AgentOperation): Record<string, unknown> {
  return operation.kind === "report_mitigation_task"
    ? { notes: "", evidenceUrl: "", ...operation.after }
    : operation.after;
}

export const agentOperationLabels: Record<string, string> = {
  create_risk: "Buat risiko", patch_risk: "Ubah risiko", add_mitigation: "Tambah mitigasi", patch_mitigation: "Ubah mitigasi", report_mitigation_task: "Lapor progres mitigasi", create_risk_event: "Catat kejadian", reassess_risk: "Buat penilaian ulang", patch_monitoring: "Perbarui draf pemantauan", link_risk_event: "Hubungkan kejadian dengan risiko",
};
export const agentFieldChoices: Record<string, [string, string][]> = {
  category: [["operasional", "Operasional"], ["kebijakan", "Kebijakan"], ["kepatuhan", "Kepatuhan"], ["fraud_korupsi", "Fraud dan korupsi"], ["reputasi", "Reputasi"], ["legal", "Legal"]],
  frequency: [["rutin", "Rutin"], ["insidental", "Insidental"]],
  mitigationType: [["reduce_probability", "Mengurangi kemungkinan"], ["reduce_impact", "Mengurangi dampak"], ["reduce_both", "Mengurangi kemungkinan dan dampak"]],
  severity: [["low", "Rendah"], ["medium", "Sedang"], ["high", "Tinggi"], ["extreme", "Ekstrem"]],
  postResponseCondition: [["recovered", "Pulih"], ["controlled", "Terkendali"], ["ongoing", "Masih berlangsung"], ["worsening", "Memburuk"], ["unknown", "Belum diketahui"]],
  status: [["pending", "Belum selesai"], ["done", "Selesai"]],
};
export const agentMonitoringNumberFields: Record<string, { min: number; max: number; label: string }> = {
  observedProbability: { min: 1, max: 5, label: "Kemungkinan teramati" },
  observedImpact: { min: 1, max: 5, label: "Dampak teramati" },
  mitigationCompletionPercent: { min: 0, max: 100, label: "Persentase penyelesaian mitigasi" },
};
const monitoringFields = new Set([...Object.keys(agentMonitoringNumberFields), "conclusion", "mitigationProgressSummary", "values"]);
const profileFields = new Set(["title", "description", "category", "cause", "riskSource", "controllability", "impactDesc", "existingControl", "controlEffectiveness", "treatmentOption", "mitigations", "changeReason"]);
const mitigationFields = new Set(["id", "action", "owner", "ownerUserId", "dueDate", "frequency", "recurringInterval", "reportDay", "reportDate", "executionScheduleText", "targetCost", "mitigationType", "activityStage", "expectedOutput", "quantitativeTarget", "supportingUnit", "resourcesRequired", "contingencyPlan", "potentialObstacle", "isBreakthroughActivity", "isExistingControl"]);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const nilUUID = "00000000-0000-0000-0000-000000000000";
const isUUID = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) && value !== nilUUID;
const validChoice = (key: string, value: unknown) => agentFieldChoices[key].some(([option]) => option === value);

function monitoringValuesError(values: unknown): string | null {
  if (!isRecord(values)) return "Rincian profil harus berupa objek JSON.";
  if (Object.keys(values).some((key) => !profileFields.has(key))) return "Rincian profil memuat bidang yang tidak dapat diubah melalui draf pemantauan.";
  for (const [key, value] of Object.entries(values)) {
    if (key === "category" && !validChoice(key, value)) return "Kategori pada rincian profil harus memakai pilihan yang tersedia.";
    if (key === "cause" || key === "impactDesc") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return "Penyebab dan uraian dampak harus berupa daftar teks.";
    } else if (key === "mitigations") {
      if (!Array.isArray(value)) return "Rincian mitigasi harus berupa daftar JSON.";
      const ids = new Set<string>();
      for (const mitigation of value) {
        if (!isRecord(mitigation) || Object.keys(mitigation).some((field) => !mitigationFields.has(field))) return "Periksa bidang pada rincian mitigasi.";
        if (mitigation.id !== undefined) {
          if (mitigation.id !== nilUUID && (!isUUID(mitigation.id) || ids.has(mitigation.id))) return "Referensi rencana mitigasi tersimpan harus berupa UUID yang unik.";
          if (mitigation.id !== nilUUID) ids.add(mitigation.id as string);
        }
        for (const field of ["frequency", "mitigationType"]) if (field in mitigation && !validChoice(field, mitigation[field])) return "Frekuensi dan jenis mitigasi harus memakai pilihan yang tersedia.";
        for (const [field, min, max] of [["reportDay", 0, 6], ["reportDate", 1, 31], ["targetCost", 0, Infinity]] as const) {
          const number = mitigation[field];
          if (number !== undefined && (typeof number !== "number" || !Number.isFinite(number) || number < min || number > max || (field !== "targetCost" && !Number.isInteger(number)))) return "Periksa rentang hari, tanggal pelaporan, dan kebutuhan biaya mitigasi.";
        }
      }
    } else if (typeof value !== "string") return "Bidang teks pada rincian profil harus berupa teks.";
  }
  return null;
}

export function agentOperationValidationError(operation: AgentOperation): string | null {
  if (!operation.included) return null;
  if (operation.kind === "report_mitigation_task") {
    if (Object.keys(operation.after).some((key) => key !== "notes" && key !== "evidenceUrl")) return "Laporan memakai field lama. Minta Agent menyusun ulang dengan Catatan Pelaksanaan dan Link Bukti.";
    if (typeof operation.after.notes !== "string" || (operation.after.evidenceUrl !== undefined && typeof operation.after.evidenceUrl !== "string")) return "Isi Catatan Pelaksanaan dan Link Bukti dengan teks.";
    const errors = validateMitigationReportForm({ notes: operation.after.notes, evidenceUrl: (operation.after.evidenceUrl as string | undefined) ?? "" });
    return errors.notes ?? errors.evidenceUrl ?? null;
  }
  if (operation.kind === "link_risk_event") {
    const ids = operation.after.riskIds;
    if (Object.keys(operation.after).some((key) => key !== "riskIds")) return "Penghubungan kejadian hanya dapat mengubah daftar risiko terkait.";
    if (!Array.isArray(ids) || !ids.length || ids.some((id) => !isUUID(id)) || new Set(ids).size !== ids.length) return "Risiko terkait harus berupa daftar UUID yang tidak kosong dan tidak berulang.";
  }
  if (operation.kind !== "patch_monitoring") return null;
  if (!Object.keys(operation.after).length || Object.keys(operation.after).some((key) => !monitoringFields.has(key))) return "Pilih bidang draf pemantauan yang didukung. Status final tidak dapat diubah melalui paket ini.";
  for (const [key, bounds] of Object.entries(agentMonitoringNumberFields)) {
    if (!(key in operation.after)) continue;
    const value = operation.after[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < bounds.min || value > bounds.max) return `${bounds.label} harus berupa bilangan bulat ${bounds.min}–${bounds.max}.`;
  }
  for (const key of ["conclusion", "mitigationProgressSummary"]) if (key in operation.after && typeof operation.after[key] !== "string") return "Kesimpulan dan ringkasan progres mitigasi harus berupa teks.";
  return "values" in operation.after ? monitoringValuesError(operation.after.values) : null;
}
