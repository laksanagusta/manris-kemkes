import { buildCurrentRiskHeatmapMatrix, buildRiskCountTrendData } from "@/lib/dashboard-insights";
import { calculateNilai, dashboardCategoryLabels, getBobot, riskCategoryColors } from "@/lib/risk";
import type { Risk, RiskCategory } from "@/types/risk";

type Category = Exclude<RiskCategory, "">;

const groups = [
  { category: "operasional", count: 18 },
  { category: "kepatuhan", count: 10 },
  { category: "fraud_korupsi", count: 7 },
  { category: "kebijakan", count: 5 },
  { category: "reputasi", count: 4 },
  { category: "legal", count: 2 },
] satisfies { category: Category; count: number }[];

export const currentCycle = "2026-Q4";
export const cycles = ["2026-Q1", "2026-Q2", "2026-Q3", currentCycle];
const quarterTotals = [32, 36, 41, 46];
const coordinates = [
  [1, 1], [2, 1], [2, 2], [3, 2], [2, 3], [3, 3], [3, 4],
  [4, 3], [4, 4], [2, 4], [4, 5], [5, 4], [5, 5],
] as const;

const assignedCategories = groups.flatMap(({ category, count }) =>
  Array.from({ length: count }, () => category),
);

const profileDefaults = {
  title: "",
  description: "",
  unitId: "ditjen-p2",
  cause: [],
  riskSource: "",
  riskOwnerId: "",
  controllability: "C",
  impactDesc: [],
  existingControl: "",
  controlOwnerId: "",
  controlEffectiveness: "",
  riskPriority: 0,
  riskAppetite: "",
  treatmentOption: "",
  mitigation: { action: "", owner: "", dueDate: "" },
  targetProbability: 2,
  targetImpact: 2,
  targetWeight: getBobot(2, 2),
  targetScore: calculateNilai(2, 2, getBobot(2, 2)),
  nextReviewDate: "",
  status: "final",
} satisfies Partial<Risk>;

export const risks: Risk[] = cycles.flatMap((assessmentCycle, quarter) =>
  assignedCategories.slice(0, quarterTotals[quarter]).map((category, index) => {
    const [probability, impact] = coordinates[(index * 7 + quarter * 2) % coordinates.length];
    const weight = getBobot(probability, impact);
    const inherentScore = calculateNilai(probability, impact, weight);

    return {
      ...profileDefaults,
      id: `${assessmentCycle}-${index}`,
      riskCode: `SIM-${index + 1}`,
      category,
      assessmentCycle,
      probability,
      impact,
      weight,
      inherentScore,
      nilai: inherentScore,
    };
  }),
);

export const quarters = buildRiskCountTrendData(risks);
export const current = quarters[quarters.length - 1];
export const matrices = cycles.map((cycle) =>
  buildCurrentRiskHeatmapMatrix(risks.filter((risk) => risk.assessmentCycle === cycle), cycle),
);

export const categoryData = groups.map(({ category, count }) => ({
  name: dashboardCategoryLabels[category],
  fill: riskCategoryColors[category],
  value: count,
}));

export const integer = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
export const percentage = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 });
