import {
  getMonitoringWindow,
  isMonitoringWindowOpen,
} from "./monitoring-window";

const quarterNames = ["I", "II", "III", "IV"];
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function periodDetails(year: number, quarter: number) {
  const cycle = `${year}-Q${quarter}`;
  const window = getMonitoringWindow(cycle);
  if (!window) return null;
  return {
    cycle,
    label: `Triwulan ${quarterNames[quarter - 1]} ${year}`,
    windowLabel: dateFormat.formatRange(
      window.start,
      new Date(window.end.getTime() - 1),
    ),
  };
}

/** Calendar context from the same Jakarta date as the server's work summary. */
export function getWorkMonitoringPeriod(today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const now = new Date(`${today}T12:00:00+07:00`);
  if (
    !Number.isFinite(now.getTime()) ||
    now.toISOString().slice(0, 10) !== today
  )
    return null;
  const year = Number(today.slice(0, 4));
  const quarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1;
  const period = periodDetails(
    quarter === 1 ? year - 1 : year,
    quarter === 1 ? 4 : quarter - 1,
  );
  if (!period) return null;
  const isOpen = isMonitoringWindowOpen(period.cycle, now);
  return {
    ...period,
    isOpen,
    next: isOpen ? null : periodDetails(year, quarter),
  };
}
