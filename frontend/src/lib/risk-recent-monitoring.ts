import { businessNow } from "./business-clock.ts";
import type { RiskRegisterListItem } from "./api/risk-register";

export function getRecentRegisterMonitoring(risk: Pick<RiskRegisterListItem, "recentMonitoring" | "semesterMonitoring">, now = businessNow()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find(part => part.type === "year")?.value);
  const month = Number(parts.find(part => part.type === "month")?.value);
  const quarterIndex = year * 4 + Math.floor((month - 1) / 3);
  return Array.from({ length: 4 }, (_, index) => {
    const period = quarterIndex - 3 + index;
    const periodYear = Math.floor(period / 4);
    const quarter = period % 4 + 1;
    const cycle = `${periodYear}-Q${quarter}`;
    const current = risk.recentMonitoring?.find(item => item.cycle === cycle);
    const key = `q${quarter}` as "q1" | "q2" | "q3" | "q4";
    // Older servers only expose this year's quarters. Never reuse them for a prior year.
    const legacy = periodYear === year ? risk.semesterMonitoring : undefined;
    return {
      cycle,
      label: `Q${quarter} ${periodYear}`,
      status: current ? current.status : legacy?.[key],
      score: current ? current.nilai : legacy?.[`${key}Nilai`],
    };
  });
}
