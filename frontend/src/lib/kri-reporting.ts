export type KRIStatus = "safe" | "warning" | "breach";
export type KRIDirection = "higher_worse" | "lower_worse";
export type KRIReportStatus = "pending" | "submitted" | "accepted" | "revision_requested" | "skipped" | string;
export type KRIReviewQueueFilter = "submitted" | "revision_requested" | "overdue";

export interface KRIThresholds {
  thresholdMin: number;
  thresholdMax: number;
  amberThresholdMin?: number | null;
  amberThresholdMax?: number | null;
}

export interface KRIReportLike {
  status: KRIReportStatus;
  value?: number | null;
  metric?: string;
  direction: KRIDirection;
  thresholds: KRIThresholds;
}

export interface KRIReviewQueueLike {
  status: KRIReportStatus;
  dueDate: string;
}

export interface SemesterSummaryItemLike {
  kriName: string;
  latestAcceptedValue?: number | null;
  metric?: string;
  acceptedCount?: number;
  overdueCount?: number;
  skippedCount?: number;
  revisionCount?: number;
  trend?: string;
  isArchived?: boolean;
}

export interface SemesterSummaryLike {
  sourceCycle: string;
  kris: SemesterSummaryItemLike[];
}

export interface SemesterSummaryDisplayItem {
  kriName: string;
  value: string;
  trend: string;
  counts: string;
  isArchived: boolean;
}

export interface SemesterSummaryDisplay {
  heading: string;
  cycle: string;
  totals: string;
  items: SemesterSummaryDisplayItem[];
}

function formatDecimal(value: number): string {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function normalizeDateOnly(value: string): number | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

export function getKRIStatus(
  currentValue: number,
  direction: KRIDirection,
  thresholds: KRIThresholds
): KRIStatus {
  if (direction === "higher_worse") {
    if (currentValue > thresholds.thresholdMax) return "breach";
    if (thresholds.amberThresholdMax !== undefined && thresholds.amberThresholdMax !== null && currentValue >= thresholds.amberThresholdMax) {
      return "warning";
    }
    return "safe";
  }

  if (currentValue < thresholds.thresholdMin) return "breach";
  if (thresholds.amberThresholdMin !== undefined && thresholds.amberThresholdMin !== null && currentValue <= thresholds.amberThresholdMin) {
    return "warning";
  }
  return "safe";
}

export function isReportOverdue(
  dueDate: string,
  status: KRIReportStatus,
  now: Date = new Date()
): boolean {
  if (status !== "pending" && status !== "revision_requested") return false;

  const due = normalizeDateOnly(dueDate);
  if (due === null) return false;

  const current = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return due < current;
}

export function isKRIReviewAttentionOverdue(
  dueDate: string,
  status: KRIReportStatus,
  now: Date = new Date()
): boolean {
  if (status !== "submitted" && status !== "revision_requested") return false;

  const due = normalizeDateOnly(dueDate);
  if (due === null) return false;

  const current = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return due < current;
}

export function filterKRIReviewQueueByState<T extends KRIReviewQueueLike>(
  items: T[],
  filter: KRIReviewQueueFilter,
  now: Date = new Date()
): T[] {
  if (filter === "overdue") {
    return items.filter((item) => isKRIReviewAttentionOverdue(item.dueDate, item.status, now));
  }

  return items.filter((item) => item.status === filter);
}

export function validateKRIRevisionReviewNote(note: string): string | null {
  if (!note.trim()) {
    return "Catatan revisi wajib diisi.";
  }

  return null;
}

export function formatKRIValue(value: number, metric = ""): string {
  const formatted = formatDecimal(value);
  return metric.trim() ? `${formatted} ${metric.trim()}` : formatted;
}

export function validateEvidenceURL(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getKRIStatusFromReport(report: KRIReportLike): KRIStatus | null {
  if (report.status !== "accepted") return null;
  if (report.value === null || report.value === undefined) return null;

  return getKRIStatus(report.value, report.direction, report.thresholds);
}

export function formatSemesterSummary(summary: SemesterSummaryLike): SemesterSummaryDisplay {
  const totals = summary.kris.reduce(
    (acc, item) => {
      acc.accepted += item.acceptedCount ?? 0;
      acc.overdue += item.overdueCount ?? 0;
      acc.skipped += item.skippedCount ?? 0;
      acc.revision += item.revisionCount ?? 0;
      return acc;
    },
    { accepted: 0, overdue: 0, skipped: 0, revision: 0 }
  );

  return {
    heading: `Semester ${summary.sourceCycle}`,
    cycle: summary.sourceCycle,
    totals: `${summary.kris.length} KRI • ${totals.accepted} accepted • ${totals.overdue} overdue • ${totals.revision} revision requested • ${totals.skipped} skipped`,
    items: summary.kris.map((item) => ({
      kriName: item.kriName,
      value: item.latestAcceptedValue === null || item.latestAcceptedValue === undefined ? "—" : formatKRIValue(item.latestAcceptedValue, item.metric),
      trend: item.trend ?? "stable",
      counts: `${item.acceptedCount ?? 0} accepted • ${item.overdueCount ?? 0} overdue • ${item.revisionCount ?? 0} revision requested • ${item.skippedCount ?? 0} skipped`,
      isArchived: item.isArchived ?? false,
    })),
  };
}
