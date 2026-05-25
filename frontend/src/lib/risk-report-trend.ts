import { resolveRiskScoreSemantics } from "./risk.js";

type RiskTrendLevel = "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";

type RiskScoreSemanticInput = Parameters<typeof resolveRiskScoreSemantics>[0];

export type RiskTrendSourceItem = {
  id?: string;
  code?: string;
  versionGroupId?: string;
  versionNumber?: number;
  assessmentCycle?: string;
  createdAt?: string;
  probability: number;
  impact: number;
  inherentScore: number;
  status?: RiskScoreSemanticInput["status"];
  targetProbability?: number;
  targetImpact?: number;
  targetScore?: number;
  targetNilai?: number;
};

export type RiskTrendPoint = { period: string } & Record<RiskTrendLevel, number>;
export type RiskPiePoint = { name: RiskTrendLevel; value: number; color: string };
export type RiskTrendWindow = "2s" | "4s" | "all";

function deriveSemester(createdAt?: string) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const half = date.getMonth() < 6 ? "H1" : "H2";
  return `${date.getFullYear()}-${half}`;
}

function normalizeSemesterKey(value?: string) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(H[12])$/i);
  if (!match) return null;
  return `${match[1]}-${match[2].toUpperCase()}`;
}

function semesterSortValue(period: string) {
  const [yearText, half] = period.split("-");
  const year = Number(yearText);
  return year * 2 + (half === "H2" ? 1 : 0);
}

function levelFromScore(score: number): RiskTrendLevel {
  if (score >= 20) return "Sangat Tinggi";
  if (score >= 15) return "Tinggi";
  if (score >= 10) return "Sedang";
  return "Rendah";
}

function effectiveTrendScore(risk: RiskTrendSourceItem) {
  const semantics = resolveRiskScoreSemantics({ weight: 1, ...risk } as RiskScoreSemanticInput);
  return semantics.effective.score;
}

export function buildRiskTrendData(
  risks: RiskTrendSourceItem[],
  window: RiskTrendWindow,
  trendColors: Record<RiskTrendLevel, string> = {
    Rendah: "",
    Sedang: "",
    Tinggi: "",
    "Sangat Tinggi": "",
  }
) {
  const trends: Record<string, RiskTrendPoint> = {};
  const pieCounts: Record<RiskTrendLevel, number> = { Rendah: 0, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 0 };

  for (const risk of risks) {
    const period = normalizeSemesterKey(risk.assessmentCycle) || deriveSemester(risk.createdAt);
    if (!period) continue;

    if (!trends[period]) {
      trends[period] = { period, Rendah: 0, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 0 };
    }

    const level = levelFromScore(effectiveTrendScore(risk));
    trends[period][level] += 1;
    pieCounts[level] += 1;
  }

  let trendData = Object.values(trends).sort((left, right) => semesterSortValue(left.period) - semesterSortValue(right.period));
  if (window !== "all") {
    const limit = window === "2s" ? 2 : 4;
    trendData = trendData.slice(-limit);
  }

  const pieData: RiskPiePoint[] = [
    { name: "Rendah", value: pieCounts.Rendah, color: trendColors.Rendah },
    { name: "Sedang", value: pieCounts.Sedang, color: trendColors.Sedang },
    { name: "Tinggi", value: pieCounts.Tinggi, color: trendColors.Tinggi },
    { name: "Sangat Tinggi", value: pieCounts["Sangat Tinggi"], color: trendColors["Sangat Tinggi"] },
  ];

  return { trendData, pieData };
}
