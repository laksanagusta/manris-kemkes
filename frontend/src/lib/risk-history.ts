import { calculateRiskMetrics, getRiskLevelLabel, resolveRiskScoreSemantics } from "./risk.js";
import type { Risk, RiskVersionTimelineItem } from "../types/risk";

export type RiskRegisterHistoryItem = {
  id: string;
  riskId: string;
  title: string;
  unit: string;
  cycle: string;
  versionNumber?: number;
  status?: Risk["status"] | RiskVersionTimelineItem["status"];
  currentLevel: string;
  previousLevel: string;
  currentScore?: number;
  previousScore?: number;
  trend: "up" | "down" | "stable";
  changeReason: string;
  reviewSummary?: string;
  changedAt?: string;
  changedAtLabel?: string;
  isCurrent?: boolean;
  isBaseline?: boolean;
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
     status: item.status ?? "draft",
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
    versionNumber: version.versionNumber,
    status: version.status,
    previousLevel: getRiskLevelLabel(previousSemantics.effective.level),
    currentLevel: getRiskLevelLabel(currentSemantics.effective.level),
    previousScore,
    currentScore,
    trend,
    changeReason: version.changeReason || `Skor ${previousScore} dibanding current ${currentScore}`,
    reviewSummary: version.reviewSummary || "",
    changedAt: version.createdAt,
    changedAtLabel: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(version.createdAt)),
    isCurrent: version.isCurrent,
  };
}

function sortRiskVersionsAscending(
  versions: RiskVersionTimelineItem[],
): RiskVersionTimelineItem[] {
  return [...versions].sort((left, right) => {
    const leftVersion = left.versionNumber ?? Number.MAX_SAFE_INTEGER;
    const rightVersion = right.versionNumber ?? Number.MAX_SAFE_INTEGER;

    if (leftVersion !== rightVersion) {
      return leftVersion - rightVersion;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

export function buildSequentialVersionHistory(
  versions: RiskVersionTimelineItem[],
): RiskRegisterHistoryItem[] {
  const ordered = sortRiskVersionsAscending(versions);

  const items: RiskRegisterHistoryItem[] = ordered.map((version, index) => {
    const previousVersion = ordered[index - 1];
    const baseline = previousVersion == null;

    if (baseline) {
      const currentSemantics = resolveTimelineScoreSemantics(version);
      const currentScore = currentSemantics.effective.score;

      return {
        id: version.id,
        riskId: version.id,
        title: version.title || "-",
        unit: version.orgName || "—",
        cycle:
          version.assessmentCycle ||
          new Date(version.createdAt).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
          }),
        versionNumber: version.versionNumber,
        status: version.status,
        previousLevel: getRiskLevelLabel(currentSemantics.effective.level),
        currentLevel: getRiskLevelLabel(currentSemantics.effective.level),
        previousScore: currentScore,
        currentScore,
        trend: "stable" as const,
        changeReason: version.changeReason || "Baseline awal risiko.",
        reviewSummary: version.reviewSummary || "",
        changedAt: version.createdAt,
        changedAtLabel: new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(version.createdAt)),
        isCurrent: version.isCurrent,
        isBaseline: true,
      };
    }

    const item = buildVersionHistoryItem(previousVersion, version);

    return {
      ...item,
      id: version.id,
      riskId: version.id,
      title: version.title || previousVersion.title || "-",
      unit: version.orgName || previousVersion.orgName || "—",
      cycle:
        version.assessmentCycle ||
        new Date(version.createdAt).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
        }),
      versionNumber: version.versionNumber,
      status: version.status,
      reviewSummary: version.reviewSummary || "",
      changedAt: version.createdAt,
      changedAtLabel: new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(version.createdAt)),
      isCurrent: version.isCurrent,
      isBaseline: false,
    };
  });

  return items.reverse();
}

export function getRiskVersionDetailHref(
  item: Pick<RiskRegisterHistoryItem, "riskId">,
) {
  return `/risk/register/${item.riskId}`;
}

export function buildApprovedRiskHistoryItem(risk: ApprovedRiskHistoryLike) {
   const currentSemantics = resolveRiskScoreSemantics({
     status: risk.status ?? "draft",
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
