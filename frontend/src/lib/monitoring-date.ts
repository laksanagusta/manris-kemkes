import { businessNow } from "./business-clock.ts";

/** Calendar date in Jakarta; independent of the browser's local timezone. */
export function todayMonitoringDate(now = businessNow()): string {
  if (!Number.isFinite(now.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function monitoringCycleForDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return "";
  return `${value.slice(0, 4)}-Q${Math.ceil(Number(value.slice(5, 7)) / 3)}`;
}

export function isValidMonitoringDate(value: string, now = businessNow()): boolean {
  return Boolean(monitoringCycleForDate(value)) && value <= todayMonitoringDate(now);
}

export function defaultMonitoringDate(cycle?: string): string {
  const today = todayMonitoringDate();
  const match = /^(\d{4})-Q([1-4])$/.exec(cycle ?? "");
  if (!match) return today;
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]) * 3, 0)).toISOString().slice(0, 10);
  return end < today ? end : today;
}

export function monitoringObservationDate(record: { observedAt?: string; startedAt: string }): string {
  return record.observedAt || todayMonitoringDate(new Date(record.startedAt));
}
