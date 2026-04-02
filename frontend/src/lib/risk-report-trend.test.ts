import assert from "node:assert/strict";
import test from "node:test";

import { buildRiskTrendData, type RiskTrendSourceItem } from "./risk-report-trend.ts";

test("buildRiskTrendData groups risks by semester assessment cycle instead of createdAt quarter", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2025-H2",
      createdAt: "2026-04-01T13:02:24.774Z",
      probability: 3,
      impact: 3,
    },
    {
      assessmentCycle: "2026-H1",
      createdAt: "2026-04-01T13:02:24.774Z",
      probability: 3,
      impact: 4,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2025-H2", Rendah: 0, Sedang: 1, Tinggi: 0, Ekstrem: 0 },
    { period: "2026-H1", Rendah: 0, Sedang: 0, Tinggi: 1, Ekstrem: 0 },
  ]);
  assert.deepEqual(result.pieData.map((item) => ({ name: item.name, value: item.value })), [
    { name: "Rendah", value: 0 },
    { name: "Sedang", value: 1 },
    { name: "Tinggi", value: 1 },
    { name: "Ekstrem", value: 0 },
  ]);
});

test("buildRiskTrendData falls back to createdAt-derived semester when assessmentCycle is missing", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      createdAt: "2026-04-01T13:02:24.774Z",
      probability: 2,
      impact: 2,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.equal(result.trendData[0]?.period, "2026-H1");
});

test("buildRiskTrendData limits trend rows by selected semester window", () => {
  const risks: RiskTrendSourceItem[] = [
    { assessmentCycle: "2025-H1", probability: 1, impact: 1 },
    { assessmentCycle: "2025-H2", probability: 1, impact: 1 },
    { assessmentCycle: "2026-H1", probability: 1, impact: 1 },
  ];

  const result = buildRiskTrendData(risks, "2s");

  assert.deepEqual(result.trendData.map((item) => item.period), ["2025-H2", "2026-H1"]);
});
