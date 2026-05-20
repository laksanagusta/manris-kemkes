import type { DashboardActionPressurePoint } from "@/types/risk";

export type MonitoringMitigationSummary = {
  totalActive: number;
  completed: number;
  overdue: number;
  completionRate: number;
};

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildMonitoringMitigationSummary(
  items: DashboardActionPressurePoint[],
): MonitoringMitigationSummary {
  const completed = items.reduce(
    (sum, item) => sum + item.mitigationsCompleted,
    0,
  );
  const overdue = items.reduce((sum, item) => sum + item.overdueMitigations, 0);
  const totalActive = completed + overdue;

  return {
    totalActive,
    completed,
    overdue,
    completionRate:
      totalActive === 0
        ? 0
        : roundToSingleDecimal((completed / totalActive) * 100),
  };
}
