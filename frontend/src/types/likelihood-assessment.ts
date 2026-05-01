export type LikelihoodMethod =
  | "frequency"
  | "probability"
  | "expert_judgement"
  | "benchmarking"
  | "consensus";

export type FrequencyType = "low_frequency" | "non_low_frequency";

export interface LikelihoodAssessment {
  id: string;
  riskId: string;
  method: LikelihoodMethod;
  frequencyType: FrequencyType;
  observationPeriodMonths: number;
  eventCount?: number;
  populationCount?: number;
  calculatedProbability?: number;
  selectedProbabilityLevel: number;
  justification: string;
  dataSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface LikelihoodAssessmentInput {
  method: LikelihoodMethod;
  frequencyType: FrequencyType;
  observationPeriodMonths: number;
  eventCount?: number;
  populationCount?: number;
  selectedProbabilityLevel: number;
  justification: string;
  dataSource: string;
}

export interface UpsertLikelihoodAssessmentResponse {
  id: string;
  calculatedProbability?: number;
  selectedProbabilityLevel: number;
  recommendedLevel: number;
}

export const LIKELIHOOD_METHOD_LABELS: Record<LikelihoodMethod, string> = {
  frequency: "Frekuensi",
  probability: "Probabilitas",
  expert_judgement: "Expert Judgement",
  benchmarking: "Data Pembanding",
  consensus: "Konsensus",
};

export const LIKELIHOOD_METHOD_DESCRIPTIONS: Record<LikelihoodMethod, string> = {
  frequency:
    "Berdasarkan jumlah kejadian risiko dalam periode pengamatan (12 bulan untuk non-low frequency, 60 bulan untuk low frequency event).",
  probability:
    "Berdasarkan perhitungan tingkat keterjadian per populasi dalam satu periode tertentu.",
  expert_judgement:
    "Berdasarkan pendapat atau hasil penelitian dari para ahli/akademisi jika data historis tidak memadai.",
  benchmarking:
    "Berdasarkan hasil estimasi dari UPR atau organisasi lain yang memiliki risiko identik.",
  consensus:
    "Berdasarkan konsensus antara pimpinan UPR, pemilik proses bisnis, dan pengelola risiko.",
};

export const FREQUENCY_TYPE_LABELS: Record<FrequencyType, string> = {
  low_frequency: "Low Frequency Event",
  non_low_frequency: "Non-Low Frequency Event",
};

export const FREQUENCY_TYPE_DESCRIPTIONS: Record<FrequencyType, string> = {
  low_frequency:
    "Kejadian risiko yang memiliki intensitas sangat rendah dalam rentang waktu satu tahun atau lebih (contoh: korupsi, kecelakaan fatal, bencana alam). Periode pengamatan: 60 bulan.",
  non_low_frequency:
    "Kejadian risiko yang memiliki intensitas sedang atau tinggi dalam rentang waktu satu tahun (contoh: kegagalan sistem IT, keterlambatan layanan). Periode pengamatan: 12 bulan.",
};

export const PROBABILITY_LABELS: Record<number, string> = {
  1: "Jarang",
  2: "Kemungkinan Kecil",
  3: "Kemungkinan Sedang",
  4: "Kemungkinan Besar",
  5: "Hampir Pasti Terjadi",
};
