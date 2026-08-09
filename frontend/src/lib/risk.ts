import type { Risk, RiskCategory, RiskLevel } from "@/types/risk";

export interface RiskMatrixSnapshot {
  probability: number;
  impact: number;
  cellKey: string;
  probabilityLabel: string;
  impactLabel: string;
}

export interface RiskScoreSnapshot {
  probability: number;
  impact: number;
  weight: number;
  nilai: number;
  score: number;
  level: RiskLevel;
  priority: number;
  matrix: RiskMatrixSnapshot;
}

export interface ResolvedRiskScoreSemantics {
  source: "inherent";
  usesReviewed: false;
  isFinalized: boolean;
  effective: RiskScoreSnapshot;
  primary: RiskScoreSnapshot;
  inherent: RiskScoreSnapshot;
}

type RiskScoreBundleInput = {
  probability: number;
  impact: number;
  weight: number;
  nilai?: number | null;
  score?: number | null;
};

type RiskScoreSemanticFields = Pick<
  Risk,
  | "status"
  | "probability"
  | "impact"
  | "weight"
  | "nilai"
  | "inherentScore"
>;

export const PROBABILITY_LABELS: Record<number, string> = {
  1: "Jarang",
  2: "Kemungkinan Kecil",
  3: "Kemungkinan Sedang",
  4: "Kemungkinan Besar",
  5: "Hampir Pasti Terjadi",
};

export const IMPACT_LABELS: Record<number, string> = {
  1: "Tidak Signifikan",
  2: "Kecil",
  3: "Sedang",
  4: "Besar",
  5: "Katastropik",
};

export const riskCategoryLabels: Record<RiskCategory, string> = {
  "": "Belum dikategorikan",
  kebijakan: "Kebijakan",
  reputasi: "Reputasi",
  fraud_korupsi: "Fraud - Korupsi",
  legal: "Legal",
  kepatuhan: "Kepatuhan",
  operasional: "Operasional",
};

export const dashboardCategoryLabels: Record<string, string> = {
  kebijakan: "Kebijakan",
  reputasi: "Reputasi",
  fraud_korupsi: "Fraud - Korupsi",
  legal: "Legal",
  kepatuhan: "Kepatuhan",
  operasional: "Operasional",
  uncategorized: "Tanpa Kategori",
};

// Bobot Matrix 5x5 based on Probability (rows) and Impact (columns)
// Rows: Probability 1-5 (Jarang to Hampir Pasti Terjadi)
// Cols: Impact 1-5 (Tdk Signifikan to Katastropik)
export const BobotMatrix: number[][] = [
  // Impact: 1(Tdk Signifikan), 2(Kecil), 3(Sedang), 4(Besar), 5(Katastropik)
  [1.0, 1.5, 2.0, 3.0, 4.0],      // Prob 1: Jarang
  [1.0, 1.8, 1.83, 1.9, 2.1],     // Prob 2: Kemungkinan Kecil
  [1.17, 1.42, 1.43, 1.46, 1.47], // Prob 3: Kemungkinan Sedang
  [1.2, 1.19, 1.3, 1.16, 1.2],    // Prob 4: Kemungkinan Besar
  [1.5, 1.4, 1.13, 1.15, 1.0],    // Prob 5: Hampir Pasti Terjadi
];

// Get bobot from matrix based on probability and impact (1-5)
export function getBobot(probability: number, impact: number): number {
  if (probability < 1 || probability > 5 || impact < 1 || impact > 5) {
    return 1.0;
  }
  return BobotMatrix[probability - 1][impact - 1];
}

// Calculate nilai = probability × impact × weight
export function calculateNilai(probability: number, impact: number, weight: number): number {
  return Math.round(probability * impact * weight * 100) / 100;
}

// Get risk level based on nilai (new Indonesian levels)
// Sangat Rendah: < 5, Rendah: 5-9, Sedang: 10-14, Tinggi: 15-19, Sangat Tinggi: >= 20
export function getRiskLevelFromNilai(nilai: number): RiskLevel {
  const rounded = Math.round(nilai);
  if (rounded >= 20) return "sangat_tinggi";
  if (rounded >= 15) return "tinggi";
  if (rounded >= 10) return "sedang";
  if (rounded >= 5) return "rendah";
  return "sangat_rendah";
}

// Legacy function - kept for backward compatibility
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 20) return "sangat_tinggi";
  if (score >= 15) return "tinggi";
  if (score >= 10) return "sedang";
  if (score >= 5) return "rendah";
  return "sangat_rendah";
}

// Get risk priority based on risk level
// Sangat Tinggi = 1, Tinggi = 2, Sedang = 3, Rendah = 4, Sangat Rendah = 5
export function getRiskPriority(level: RiskLevel): number {
  const priorities: Record<RiskLevel, number> = {
    sangat_tinggi: 1,
    tinggi: 2,
    sedang: 3,
    rendah: 4,
    sangat_rendah: 5,
  };
  return priorities[level] || 5;
}

export interface RiskAssessmentClassification {
  score: number;
  level: RiskLevel;
  priority: number;
  appetite: "dalam_batas" | "di_atas_batas";
  isRiskUtama: boolean;
}

export function resolveRiskAssessmentClassification(
  nilai: number,
): RiskAssessmentClassification {
  const score = Math.round(nilai);
  const level = getRiskLevelFromNilai(nilai);

  return {
    score,
    level,
    priority: getRiskPriority(level),
    appetite: resolveRiskAppetite(score),
    isRiskUtama: isRiskUtama(score),
  };
}

export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    sangat_rendah: "Sangat Rendah",
    rendah: "Rendah",
    sedang: "Sedang",
    tinggi: "Tinggi",
    sangat_tinggi: "Sangat Tinggi",
  };
  return labels[level] || level;
}

export function levelToColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    sangat_rendah: "bg-green-100 text-green-700 border-green-200",
    rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
    sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
    tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
    sangat_tinggi: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  };
  return colors[level] || "";
}

export function levelToFillColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    sangat_rendah: "rgb(74 222 128)",
    rendah: "var(--color-risk-low)",
    sedang: "var(--color-risk-medium)",
    tinggi: "var(--color-risk-high)",
    sangat_tinggi: "var(--color-risk-extreme)",
  };
  return colors[level] || "var(--color-risk-low)";
}

export function getRiskLevelDisplayLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    sangat_tinggi: "Sangat Tinggi",
    tinggi: "Tinggi",
    sedang: "Sedang",
    rendah: "Rendah",
    sangat_rendah: "Sangat Rendah",
  };
  return labels[level] || level;
}

export function getLevelBadgeClasses(level: string): string {
  switch (level) {
    case "Ekstrem":
    case "Sangat Tinggi":
    case "sangat_tinggi":
      return "bg-red-500/15 text-red-700 border-red-500/30";
    case "Tinggi":
    case "tinggi":
      return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    case "Sedang":
    case "sedang":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    case "Rendah":
    case "rendah":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    default:
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  }
}

export function getScoreBtnColorClasses(score: number): string {
  if (score >= 20) return "bg-red-500 text-white hover:bg-red-600";
  if (score >= 15) return "bg-orange-500 text-white hover:bg-orange-600";
  if (score >= 10) return "bg-yellow-500 text-white hover:bg-yellow-600";
  if (score >= 5) return "bg-blue-500 text-white hover:bg-blue-600";
  return "bg-emerald-500 text-white hover:bg-emerald-600";
}

// Calculate all risk metrics at once
export function calculateRiskMetrics(probability: number, impact: number) {
  const weight = getBobot(probability, impact);
  const nilai = calculateNilai(probability, impact, weight);
  const inherentScore = Math.round(nilai);
  const level = getRiskLevelFromNilai(nilai);
  const priority = getRiskPriority(level);

  return {
    weight,
    nilai,
    inherentScore,
    level,
    priority,
  };
}

/**
 * Resolve risk appetite status based on inherentScore.
 * Per KMK: inherentScore < 10 → "dalam_batas", >= 10 → "di_atas_batas"
 */
export function resolveRiskAppetite(inherentScore: number): "dalam_batas" | "di_atas_batas" {
	return inherentScore < 10 ? "dalam_batas" : "di_atas_batas";
}

/**
 * Returns true if risk is "risk utama" (Sedang or higher).
 * Per KMK: inherentScore >= 10 corresponds to Sedang/Tinggi/SangatTingkat.
 */
export function isRiskUtama(inherentScore: number): boolean {
	return inherentScore >= 10;
}

function isExplicitNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

function buildRiskMatrixSnapshot(probability: number, impact: number): RiskMatrixSnapshot {
  return {
    probability,
    impact,
    cellKey: `${probability}-${impact}`,
    probabilityLabel: PROBABILITY_LABELS[probability] ?? String(probability),
    impactLabel: IMPACT_LABELS[impact] ?? String(impact),
  };
}

function buildRiskScoreSnapshot(bundle: RiskScoreBundleInput): RiskScoreSnapshot {
  const nilai = isExplicitNumber(bundle.nilai)
    ? bundle.nilai
    : calculateNilai(bundle.probability, bundle.impact, bundle.weight);
  const score = isExplicitNumber(bundle.score) ? bundle.score : Math.round(nilai);
  const level = getRiskLevelFromNilai(nilai);

  return {
    probability: bundle.probability,
    impact: bundle.impact,
    weight: bundle.weight,
    nilai,
    score,
    level,
    priority: getRiskPriority(level),
    matrix: buildRiskMatrixSnapshot(bundle.probability, bundle.impact),
  };
}

export function resolveRiskScoreSemantics(risk: RiskScoreSemanticFields): ResolvedRiskScoreSemantics {
  const inherent = buildRiskScoreSnapshot({
    probability: risk.probability,
    impact: risk.impact,
    weight: risk.weight,
    nilai: risk.nilai,
    score: risk.inherentScore,
  });

  return {
    source: "inherent",
    usesReviewed: false,
    isFinalized: risk.status === "approved",
    effective: inherent,
    primary: inherent,
    inherent,
  };
}

// Simpulan utilities for Risk Assessment
export function getSimpulanTingkatRisiko(nilaiCurrent: number, nilaiBaru: number): string {
  if (nilaiBaru === nilaiCurrent) return "Tidak ada penurunan tingkat risiko";
  if (nilaiBaru > nilaiCurrent) return "Tingkat risiko mengalami peningkatan";
  return "Tingkat risiko mengalami penurunan";
}

export function getSimpulanEfektifitas(nilaiCurrent: number, nilaiBaru: number): string {
  if (nilaiBaru < nilaiCurrent) return "Efektif";
  return "Tidak Efektif";
}

export function getSimpulanTingkatRisikoColor(nilaiCurrent: number, nilaiBaru: number): string {
  if (nilaiBaru === nilaiCurrent) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (nilaiBaru > nilaiCurrent) return "bg-red-100 text-red-700 border-red-200";
  return "bg-green-100 text-green-700 border-green-200";
}

export function getSimpulanEfektifitasColor(nilaiCurrent: number, nilaiBaru: number): string {
  if (nilaiBaru < nilaiCurrent) return "bg-green-100 text-green-700 border-green-200";
  return "bg-red-100 text-red-700 border-red-200";
}
