export type Controllability = "C" | "UC";
export type ControlEffectiveness = "" | "efektif" | "tidak_efektif";
export type MitigationFrequency = "insidental" | "rutin";
export type RecurringInterval = "harian" | "mingguan" | "bulanan" | "triwulan" | "semesteran" | "tahunan";
export type TreatmentOption = "" | "menghindari" | "berbagi" | "mitigasi" | "menerima";
export type RiskStatus = "assessment_draft" | "assessment_in_review" | "approved";
export type RiskCategory = "" | "kebijakan" | "reputasi" | "fraud_korupsi" | "legal" | "kepatuhan" | "operasional";
export type RiskSource = "" | "internal" | "eksternal";
export type RiskAppetite = "" | "dalam_batas" | "di_atas_batas";

export type DraftApprovalLineMember = {
  id: string;
  name: string;
  type?: string;
  role?: string;
};

export type RiskLevel = "sangat_rendah" | "rendah" | "sedang" | "tinggi" | "sangat_tinggi";

export type RiskReviewType = "periodic" | "ad_hoc";
export type MitigationType = "reduce_probability" | "reduce_impact" | "reduce_both";

export interface RiskMitigation {
  id?: string;
  action: string;
  owner: string;
  ownerUserId?: string;
  treatmentOwnerId?: string;
  externalPicId?: string;
  dueDate: string;
  frequency?: MitigationFrequency;
  recurringInterval?: RecurringInterval;
  reportDay?: number;   // 0=Sun..6=Sat (for mingguan)
  reportDate?: number;  // 1-31 (for bulanan/triwulan)
  executionScheduleText?: string;
  targetCost?: number;
  mitigationType?: MitigationType;
  activityStage?: string;
  expectedOutput?: string;
  quantitativeTarget?: string;
  supportingUnit?: string;
  resourcesRequired?: string;
  contingencyPlan?: string;
  potentialObstacle?: string;
  costBenefitNote?: string;
  isBreakthroughActivity?: boolean;
  isExistingControl?: boolean;
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
  nilai?: number;
  targetScore: number;
  targetNilai?: number;
  createdAt: string;
}

export interface RiskVersionTimelineItem {
  id: string;
  code?: string;
  title: string;
  status: RiskStatus;
  isCurrent: boolean;
  versionGroupId: string;
  versionNumber?: number;
  previousRiskId?: string | null;
  probability: number;
  impact: number;
  inherentScore: number;
  nilai?: number;
  targetScore?: number;
  targetNilai?: number;
  assessmentCycle?: string;
  reviewType?: RiskReviewType | "";
  reviewScheduleText?: string;
  changeReason?: string;
  reviewSummary?: string;
  createdAt: string;
  updatedAt?: string;
  orgName?: string;
}

export type RiskReviewStatus = "due" | "in_draft" | "pending_approval" | "approved" | "overdue" | "rejected";

export interface RiskReviewQueueItem {
  riskId: string;
  versionGroupId: string;
  code: string;
  title: string;
  orgName: string;
  currentStatus: RiskStatus | string;
  reviewStatus: RiskReviewStatus | string;
  assessmentCycle: string;
  currentScore: number;
  currentLevel: string;
  candidateRiskId?: string | null;
  candidateStatus?: string | null;
  candidateScore?: number | null;
  candidateLevel?: string | null;
  nextReviewDate?: string | null;
  changeReason?: string;
  reviewSummary?: string;
  candidateUpdatedAt?: string | null;
}

export interface RiskCycleComparisonItem {
  versionGroupId: string;
  code: string;
  title: string;
  orgName: string;
  fromCycle: string;
  toCycle: string;
  previousScore: number;
  currentScore: number;
  previousLevel: string;
  currentLevel: string;
  scoreDelta: number;
  movement: "up" | "down" | "stable" | string;
  changeReason?: string;
}

export interface RiskFieldDiff {
  field: string;
  label: string;
  before?: unknown;
  after?: unknown;
  changeType: "added" | "removed" | "modified" | string;
}

export interface RiskMitigationDiff {
  rowKey: string;
  changeType: "added" | "removed" | "modified" | string;
  fieldDiffs: RiskFieldDiff[];
  beforeLabel?: string;
  afterLabel?: string;
}

export interface RiskCycleSideBySideSnapshot {
  description?: string;
  category?: RiskCategory;
  cause?: string[];
  existingControl?: string;
  probability?: number;
  impact?: number;
  inherentScore?: number;
  nilai?: number;
  riskPriority?: number;
  treatmentOption?: string;
  targetProbability?: number;
  targetImpact?: number;
  targetScore?: number;
  targetNilai?: number;
  nextReviewDate?: string;
  mitigations?: string[];
}

export interface RiskCycleDetailedComparisonItem {
  changeCategory: "changed" | "stable" | "added" | "removed" | string;
  versionGroupId: string;
  code: string;
  title: string;
  orgName: string;
  fromCycle: string;
  toCycle: string;
  fromRiskId?: string;
  toRiskId?: string;
  fromSnapshot?: RiskCycleSideBySideSnapshot;
  toSnapshot?: RiskCycleSideBySideSnapshot;
  fieldDiffs: RiskFieldDiff[];
  mitigationDiffs: RiskMitigationDiff[];
  changeReason?: string;
  reviewSummary?: string;
}

export interface RiskCycleDetailedComparisonSummary {
  fromCycle: string;
  toCycle: string;
  totalFrom: number;
  totalTo: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  stableCount: number;
}

export interface RiskCycleDetailedComparisonReport {
  summary: RiskCycleDetailedComparisonSummary;
  items: RiskCycleDetailedComparisonItem[];
}

export interface HeatmapCell {
  probability: number;
  impact: number;
  count: number;
}

export interface RiskReviewUnitCompletion {
  orgName: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export interface RiskReviewSummary {
  cycle: string;
  previousCycle: string;
  totalDue: number;
  completed: number;
  pendingApproval: number;
  overdue: number;
  inDraft: number;
  unitCompletion: RiskReviewUnitCompletion[];
  previousHeatmap: HeatmapCell[];
  currentHeatmap: HeatmapCell[];
}

export interface DashboardActionPressurePoint {
  period: string;
  totalMitigations: number;
  incidentsCreated: number;
  mitigationsCompleted: number;
  overdueMitigations: number;
}

export interface ExecutiveAlert {
  id: string;
  category: "new_extreme" | "risk_up" | "mitigation_overdue" | "unit_no_update" | string;
  severity: "high" | "medium" | "low" | string;
  title: string;
  detail: string;
  orgName?: string;
  riskCode?: string;
}

export interface Risk {
  id: string;
  riskCode: string;
  code?: string;
  title: string;
  description: string;
  category: RiskCategory;
  unitId: string;
  cause: string[];
  riskSource: RiskSource;
  riskOwnerId: string;
  controllability: Controllability;
  impactDesc: string[];
  existingControl: string;
  controlOwnerId: string;
  controlEffectiveness: ControlEffectiveness;
  probability: number;
  impact: number;
  weight: number;
  nilai?: number;
  inherentScore: number;
  riskPriority: number;
  riskAppetite: RiskAppetite;
  treatmentOption: TreatmentOption;
  mitigation: RiskMitigation;
  mitigations?: RiskMitigation[];
  targetProbability: number;
  targetImpact: number;
  targetWeight: number;
  targetNilai?: number;
  targetScore: number;
  nextReviewDate: string;
  reviewScheduleText?: string;
  status: RiskStatus;
  versionGroupId?: string;
  versionNumber?: number;
  previousRiskId?: string | null;
  isCurrent?: boolean;
  assessmentCycle?: string;
  reviewType?: RiskReviewType | "";
  changeReason?: string;
  reviewSummary?: string;
  orgName?: string;
  createdByName?: string;
  updatedAt?: string;
  fishboneDraft?: import("./fishbone").FishboneDraft | null;
  draftApprovalLine?: DraftApprovalLineMember[];
  draftId?: string | null;
  draftStatus?: RiskStatus | null;
  hasOngoing?: boolean;
  monitoringStatus?: string | null;
  lastMonitoredAt?: string | null;
  objectiveId?: string;
  roId?: string;

}

export interface DashboardRiskCategoryItem {
  category: string;
  count: number;
  sangatRendah: number;
  rendah: number;
  sedang: number;
  tinggi: number;
  ekstrem: number;
}

// ── Dashboard Analytics (Phase 2) ──────────────────────────────────

export interface HeatmapVelocityCell {
  probability: number;
  impact: number;
  count: number;
  upCount: number;
  downCount: number;
  stableCount: number;
  newCount: number;
}

export interface OverdueMitigationTimelineItem {
  orgId: string;
  orgName: string;
  onTimeCount: number;
  overdue7Count: number;
  overdue30Count: number;
  overdue30PlusCount: number;
  totalCount: number;
}

export interface KRIBreachItem {
  kriId: string;
  kriName: string;
  threshold: number;
  actualValue: number;
  unit: string;
  status: 'safe' | 'warning' | 'breach';
  riskTitle: string;
  orgName: string;
}

export interface UnitResponseTime {
  orgId: string;
  orgName: string;
  avgMitigationDays: number;
  avgApprovalDays: number;
  taskCount: number;
}

/** Subset of Risk fields returned by GET /api/v1/dashboard/top-risks */
export interface TopRiskItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: RiskCategory;
  status: RiskStatus;
  orgName: string;
  probability: number;
  impact: number;
  inherentScore: number;
  nilai?: number;
  treatmentOption: TreatmentOption;
  assessmentCycle?: string;
  createdAt: string;
  updatedAt: string;
}
