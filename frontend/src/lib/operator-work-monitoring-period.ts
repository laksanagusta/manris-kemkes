import { createDisplayDateFormatter } from "./display-date.ts";


const quarterNames = ["I", "II", "III", "IV"];
const dateFormat = createDisplayDateFormatter("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function periodDetails(year: number, quarter: number) {
  const cycle = `${year}-Q${quarter}`;
  const window = { start: new Date(`${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01T00:00:00+07:00`), end: new Date(Date.UTC(year, quarter * 3, 1) - 7 * 3600000) };
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
  const period = periodDetails(year, quarter);
  return { ...period, isOpen: true, next: null };
}
