import type { Risk } from "../types/risk";
import type { WorkingPaperRiskData } from "../types/working-paper";
import { calculateNilai, getRiskLevelDisplayLabel, getRiskLevelFromNilai, getRiskPriority } from "./risk";

/** Export the selected profile itself, without replacing it with monitoring observations. */
export function toRiskProfileExportRow(risk: Risk): WorkingPaperRiskData {
  const nilai = risk.nilai ?? risk.inherentScore ?? calculateNilai(risk.probability, risk.impact, risk.weight);
  const targetNilai = risk.targetNilai ?? risk.targetScore ?? calculateNilai(risk.targetProbability, risk.targetImpact, risk.targetWeight);
  const level = getRiskLevelFromNilai(nilai);
  return {
    id: risk.id,
    title: risk.title,
    category: risk.category,
    status: risk.status,
    code: risk.code ?? risk.riskCode,
    org_name: risk.orgName,
    probability: risk.probability,
    impact: risk.impact,
    bobot: risk.weight,
    nilai,
    tingkat_risiko: level,
    tingkat_risiko_display: getRiskLevelDisplayLabel(level),
    prioritas_risiko: risk.riskPriority ?? getRiskPriority(level),
    existing_control: risk.existingControl,
    jadwal_pelaksanaan: risk.nextReviewDate?.split("T")[0],
    penanggung_jawab: (risk.mitigations ?? []).map((item) => item.owner).filter(Boolean).join(", "),
    target_probability: risk.targetProbability,
    target_impact: risk.targetImpact,
    target_bobot: risk.targetWeight,
    target_nilai: targetNilai,
    target_tingkat_risiko: getRiskLevelFromNilai(targetNilai),
    target_tingkat_risiko_display: getRiskLevelDisplayLabel(getRiskLevelFromNilai(targetNilai)),
  };
}

type ExportPage<T> = { data: T[]; total: number; page: number; limit: number };

/** Follow the server's actual page size rather than assuming the requested limit. */
export async function collectRiskExportItems<T>(
  fetchPage: (page: number) => Promise<ExportPage<T>>,
): Promise<T[]> {
  const items: T[] = [];
  let expectedTotal: number | undefined;
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page);
    expectedTotal ??= result.total;
    if (result.total !== expectedTotal || result.page !== page) {
      throw new Error("Data risiko berubah. Muat ulang dan coba ekspor kembali.");
    }
    if (result.data.length === 0 && items.length < result.total) {
      throw new Error("Data risiko berubah. Muat ulang dan coba ekspor kembali.");
    }
    items.push(...result.data);
    if (items.length >= result.total) return items;
  }
}
