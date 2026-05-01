// KMK Impact Criteria Matrix types per kmk.md Tabel 2

export type ImpactCriteriaCategory =
  | "kebijakan"
  | "reputasi"
  | "fraud_korupsi"
  | "legal"
  | "kepatuhan"
  | "operasional";

export type ImpactCriteriaUPRLevel =
  | "kementerian"
  | "upr_t1"
  | "upr_t2";

export interface ImpactCriteria {
  id: string;
  category: ImpactCriteriaCategory;
  uprLevel: ImpactCriteriaUPRLevel;
  impactLevel: number;
  impactLabel: string;
  description: string;
}

// Label helpers
export const impactCategoryLabels: Record<ImpactCriteriaCategory, string> = {
  kebijakan: "Kebijakan",
  reputasi: "Reputasi",
  fraud_korupsi: "Fraud/Korupsi",
  legal: "Legal",
  kepatuhan: "Kepatuhan",
  operasional: "Operasional",
};

export const impactLevelLabels: Record<number, string> = {
  1: "Tidak Signifikan",
  2: "Kecil",
  3: "Sedang",
  4: "Besar",
  5: "Katastropik",
};

export const validCategories: ImpactCriteriaCategory[] = [
  "kebijakan",
  "reputasi",
  "fraud_korupsi",
  "legal",
  "kepatuhan",
  "operasional",
];

export const validUPRLevels: ImpactCriteriaUPRLevel[] = [
  "kementerian",
  "upr_t1",
  "upr_t2",
];