export type Controllability = "C" | "UC";
export type ControlEffectiveness = "" | "efektif" | "tidak_efektif";
export type MitigationFrequency = "insidental" | "rutin";
export type RecurringInterval = "harian" | "mingguan" | "bulanan" | "triwulan" | "semesteran" | "tahunan";
export type TreatmentOption = "" | "avoid" | "mitigate" | "transfer" | "accept";
export type RiskStatus = "draft" | "final" | "approved" | "rejected";

export type RiskLevel = "rendah" | "sedang" | "tinggi" | "ekstrem";

export interface RiskMitigation {
  id?: string;
  action: string;
  owner: string;
  treatmentOwnerId?: string;
  dueDate: string;
  frequency: MitigationFrequency;
  recurringInterval?: RecurringInterval;
  reportDay?: number;   // 0=Sun..6=Sat (for mingguan)
  reportDate?: number;  // 1-31 (for bulanan/triwulan)
  targetCost?: number;
}

export type MitigationTaskStatus = "pending" | "done" | "overdue" | "skipped";

export interface MitigationTask {
  id: string;
  mitigationId: string;
  riskId: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: MitigationTaskStatus;
  progressPct: number;
  actualCost: number;
  evidenceUrl: string;
  notes: string;
  reportedBy?: string;
  reportedByName?: string;
  reportedAt?: string;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  mitigationAction: string;
  mitigationOwner: string;
  riskCode: string;
  riskTitle: string;
}

export interface RiskVersion {
  id: string;
  period: string;
  level: RiskLevel;
  inherentScore: number;
  targetScore: number;
  createdAt: string;
}

export interface Risk {
  id: string;
  riskCode: string;
  title: string;
  description: string;
  unitId: string;
  cause: string[];
  riskSource: string;
  riskOwnerId: string;
  controllability: Controllability;
  impactDesc: string[];
  existingControl: string;
  controlOwnerId: string;
  controlEffectiveness: ControlEffectiveness;
  probability: number;
  impact: number;
  weight: number;
  riskPriority: number;
  riskAppetite: string;
  treatmentOption: TreatmentOption;
  mitigation: RiskMitigation;
  targetProbability: number;
  targetImpact: number;
  targetWeight: number;
  nextReviewDate: string;
  status: RiskStatus;
  fishboneDraft?: import("./fishbone").FishboneDraft | null;
}
