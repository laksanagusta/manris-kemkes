export type FishboneCategory = "manusia" | "metode" | "mesin" | "material" | "lingkungan";

export interface FishboneDraft {
  categories: Record<FishboneCategory, string[]>;
}
