import type { RiskCategory, RiskLevel } from "@/types/risk";

export const riskCategoryLabels: Record<RiskCategory, string> = {
  "": "Belum dikategorikan",
  strategis: "Strategis",
  operasional: "Operasional",
  kepatuhan: "Kepatuhan",
  finansial: "Finansial",
  reputasi: "Reputasi",
  teknologi_informasi: "Teknologi Informasi",
};

export const dashboardCategoryLabels: Record<string, string> = {
  strategis: "Strategis",
  operasional: "Operasional",
  kepatuhan: "Kepatuhan",
  finansial: "Finansial",
  reputasi: "Reputasi",
  hukum: "Hukum",
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
  if (nilai >= 20) return "sangat_tinggi";
  if (nilai >= 15) return "tinggi";
  if (nilai >= 10) return "sedang";
  if (nilai >= 5) return "rendah";
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

// Calculate all risk metrics at once
export function calculateRiskMetrics(probability: number, impact: number) {
  const weight = getBobot(probability, impact);
  const nilai = calculateNilai(probability, impact, weight);
  const level = getRiskLevelFromNilai(nilai);
  const priority = getRiskPriority(level);

  return {
    weight,
    nilai,
    level,
    priority,
  };
}
