import { calculateRiskMetrics, getRiskLevelFromNilai, getRiskLevelLabel, resolveRiskScoreSemantics } from "./risk.js";
import type { Risk, RiskVersionTimelineItem } from "../types/risk";

export type RiskRegisterHistoryItem = {
  id: string;
  riskId: string;
  title: string;
  unit: string;
  cycle: string;
  currentLevel: string;
  previousLevel: string;
  trend: "up" | "down" | "stable";
  changeReason: string;
  isCurrent: boolean;
};

type RiskScoreLike = {
  status?: Risk["status"] | RiskVersionTimelineItem["status"];
  probability?: number;
  impact?: number;
  inherentScore?: number;
  nilai?: number | null;
};

export type ApprovedRiskHistoryLike = {
  code?: string;
  title?: string;
  orgName?: string;
  status?: Risk["status"];
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number | null;
  inherentScore?: number;
  targetScore?: number;
};

function resolveTimelineScoreSemantics(item: RiskScoreLike) {
   const fallbackMetrics = calculateRiskMetrics(item.probability ?? 1, item.impact ?? 1);

   return resolveRiskScoreSemantics({
     status: item.status ?? "assessment_draft",
     probability: item.probability ?? 1,
     impact: item.impact ?? 1,
     weight: fallbackMetrics.weight,
     nilai: item.nilai ?? fallbackMetrics.nilai,
     inherentScore: item.inherentScore ?? fallbackMetrics.inherentScore,
   });
 }

export function buildVersionHistoryItem(
  version: RiskVersionTimelineItem,
  current: RiskVersionTimelineItem,
): RiskRegisterHistoryItem {
  const previousSemantics = resolveTimelineScoreSemantics(version);
  const currentSemantics = resolveTimelineScoreSemantics(current);
  const previousScore = previousSemantics.effective.score;
  const currentScore = currentSemantics.effective.score;

  let trend: RiskRegisterHistoryItem["trend"] = "stable";
  if (currentScore > previousScore) trend = "up";
  if (currentScore < previousScore) trend = "down";

  return {
    id: version.id,
    riskId: version.id,
    title: version.title || current.title || "-",
    unit: current.orgName || version.orgName || "—",
    cycle: version.assessmentCycle || new Date(version.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "short" }),
    previousLevel: getRiskLevelLabel(previousSemantics.effective.level),
    currentLevel: getRiskLevelLabel(currentSemantics.effective.level),
    trend,
    changeReason: version.changeReason || `Skor ${previousScore} dibanding current ${currentScore}`,
    isCurrent: version.isCurrent,
  };
}

export function buildApprovedRiskHistoryItem(risk: ApprovedRiskHistoryLike) {
   const currentSemantics = resolveRiskScoreSemantics({
     status: risk.status ?? "assessment_draft",
     probability: risk.probability ?? 1,
     impact: risk.impact ?? 1,
     weight: risk.weight ?? calculateRiskMetrics(risk.probability ?? 1, risk.impact ?? 1).weight,
     nilai: risk.nilai ?? undefined,
     inherentScore: risk.inherentScore ?? calculateRiskMetrics(risk.probability ?? 1, risk.impact ?? 1).inherentScore,
   });
  const currentScore = currentSemantics.effective.score;
  const targetScore = risk.targetScore ?? 0;

  let previousLevel = "Rendah";
  if (targetScore >= 20) previousLevel = "Sangat Tinggi";
  else if (targetScore >= 15) previousLevel = "Tinggi";
  else if (targetScore >= 10) previousLevel = "Sedang";

  let trend: RiskRegisterHistoryItem["trend"] = "stable";
  if (currentScore > targetScore) trend = "up";
  if (currentScore < targetScore) trend = "down";

  return {
    riskId: risk.code || "-",
    title: risk.title || "-",
    unit: risk.orgName || "—",
    currentLevel: getRiskLevelLabel(currentSemantics.effective.level),
    previousLevel,
    trend,
    changeReason: `Skor target: ${targetScore}, skor current/final: ${currentScore}`,
  };
}
