import { getRiskLevelFromNilai, resolveRiskAppetite } from "./risk.ts";
import { percentage } from "./quarterly-report.ts";
import type { QuarterlyReport } from "../types/quarterly-report";

export type AnnualProgressRisk = {
  groupId: string;
  score: number | null;
  weight: number | null;
  target: number | null;
};

export type MonitoringRuleProgressOption = {
  id: string;
  name: string;
  year: number;
  organizations: QuarterlyReport["organizations"];
};

export type AnnualProfileProgressReport = {
  organizations: QuarterlyReport["organizations"];
  baseline: AnnualProgressRisk[];
  periods: {
    id: string;
    label: string;
    risks: AnnualProgressRisk[];
    totalRisks: number;
    reportedTasks: number;
    totalTasks: number;
  }[];
  latest?: QuarterlyReport;
};

const levels = { sangat_rendah: 0, rendah: 0, sedang: 0, tinggi: 0, sangat_tinggi: 0 };
const positive = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;

const average = (sum: number, count: number) => count ? sum / count : null;

export function buildAnnualProgressSeries(report: AnnualProfileProgressReport) {
  const baseline = new Map(report.baseline.map((risk) => [risk.groupId, risk.score]));

  return [
    { id: "baseline", label: "Baseline", risks: report.baseline, totalRisks: report.baseline.length, reportedTasks: 0, totalTasks: 0 },
    ...report.periods,
  ].map((period, index) => {
    const distribution = { ...levels };
    let scores = 0;
    let scoreCount = 0;
    let weights = 0;
    let weightCount = 0;
    let pairedScores = 0;
    let targets = 0;
    let targetCount = 0;
    let above = 0;
    let up = 0;
    let down = 0;
    let stable = 0;
    for (const risk of period.risks) {
      if (!positive(risk.score)) continue;
      scores += risk.score;
      scoreCount++;
      distribution[getRiskLevelFromNilai(risk.score)]++;
      const score = Math.round(risk.score);
      if (resolveRiskAppetite(score) === "di_atas_batas") above++;
      if (positive(risk.weight)) {
        weights += risk.weight;
        weightCount++;
      }
      if (positive(risk.target)) {
        pairedScores += risk.score;
        targets += risk.target;
        targetCount++;
      }
      const startScore = baseline.get(risk.groupId) ?? null;
      if (index === 0 || !positive(startScore)) continue;
      const start = Math.round(startScore);
      if (score > start) up++;
      else if (score < start) down++;
      else stable++;
    }
    const compared = up + down + stable;
    return {
      id: period.id,
      label: period.label,
      score: average(scores, scoreCount),
      weight: average(weights, weightCount),
      scoreCount,
      weightCount,
      totalRisks: period.totalRisks,
      ...Object.fromEntries(Object.entries(distribution).map(([key, count]) => [key, scoreCount ? count : null])),
      scoreWithTarget: average(pairedScores, targetCount),
      target: average(targets, targetCount),
      targetCount,
      mitigation: percentage(period.reportedTasks, period.totalTasks),
      reportedTasks: period.reportedTasks,
      totalTasks: period.totalTasks,
      above: scoreCount ? above : null,
      within: scoreCount ? scoreCount - above : null,
      up: compared ? up : null,
      down: compared ? down : null,
      stable: compared ? stable : null,
      compared,
    };
  });
}

export type AnnualProgressPoint = ReturnType<typeof buildAnnualProgressSeries>[number];
