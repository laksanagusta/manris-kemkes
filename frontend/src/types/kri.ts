export type KRISemesterSummaryTrend = "up" | "down" | "stable" | string;

export interface KRIAcceptedTrendBasis {
  previousAcceptedValue?: number | null;
  latestAcceptedValue?: number | null;
  delta?: number | null;
}

export interface KRILastAcceptedReport {
  reportId: string;
  periodLabel: string;
  dueDate: string;
  reviewedAt?: string;
  value?: number | null;
}

export interface KRISemesterSummaryItem {
  kriId: string;
  kriName: string;
  isArchived: boolean;
  metric?: string;
  latestAcceptedValue?: number | null;
  trend: KRISemesterSummaryTrend;
  trendBasis?: KRIAcceptedTrendBasis;
  acceptedCount: number;
  overdueCount: number;
  skippedCount: number;
  revisionCount: number;
  lastAcceptedReport?: KRILastAcceptedReport;
}

export interface KRISemesterSummaryResponse {
  riskId: string;
  riskVersionGroupId: string;
  sourceCycle: string;
  kris: KRISemesterSummaryItem[];
}
