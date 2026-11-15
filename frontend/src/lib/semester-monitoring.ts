import type { SemesterMonitoringObservation, SemesterSnapshot } from "./api/upr-workflow";

// Historical frozen snapshots predate latestMonitoring and retain quarter labels.
function observationDate(item: SemesterMonitoringObservation): string {
  if (item.observedAt) return item.observedAt;
  const match = /^(\d{4})-Q([1-4])$/.exec(item.period);
  if (!match) return "";
  return `${match[1]}-${String(Number(match[2]) * 3).padStart(2, "0")}-${[31, 30, 30, 31][Number(match[2]) - 1]}`;
}

export function latestSemesterMonitoring(risk: Pick<SemesterSnapshot["risks"][number], "monitoring" | "latestMonitoring">): SemesterMonitoringObservation | null {
  if (risk.latestMonitoring) return risk.latestMonitoring;
  return risk.monitoring.reduce<SemesterMonitoringObservation | null>((latest, item) => {
    if (!latest) return item;
    const order = observationDate(item).localeCompare(observationDate(latest)) ||
      (item.finalizedAt ?? "").localeCompare(latest.finalizedAt ?? "") || item.id.localeCompare(latest.id);
    return order > 0 ? item : latest;
  }, null);
}
