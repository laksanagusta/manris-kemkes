import assert from "node:assert/strict";
import test from "node:test";

// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { buildRiskTrendData, type RiskTrendSourceItem } from "./risk-report-trend.ts";

test("buildRiskTrendData groups risks by semester assessment cycle instead of createdAt quarter", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2025-H2",
      createdAt: "2026-04-01T13:02:24.774Z",
      probability: 3,
      impact: 3,
      inherentScore: 9,
    },
    {
      assessmentCycle: "2026-H1",
      createdAt: "2026-04-01T13:02:24.774Z",
      probability: 3,
      impact: 4,
      inherentScore: 12,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2025-H2", Rendah: 1, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 0 },
    { period: "2026-H1", Rendah: 0, Sedang: 1, Tinggi: 0, "Sangat Tinggi": 0 },
  ]);
  assert.deepEqual(result.pieData.map((item) => ({ name: item.name, value: item.value })), [
    { name: "Rendah", value: 1 },
    { name: "Sedang", value: 1 },
    { name: "Tinggi", value: 0 },
    { name: "Sangat Tinggi", value: 0 },
  ]);
});

test("buildRiskTrendData promotes approved complete reviewed bundles to effective score buckets", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "approved",
      probability: 2,
      impact: 2,
      inherentScore: 4,
      reviewedProbability: 5,
      reviewedImpact: 5,
      reviewedWeight: 1,
      reviewedNilai: 25,
      reviewedScore: 20,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2026-H1", Rendah: 0, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 1 },
  ]);
});

test("buildRiskTrendData falls back to inherent semantics for approved partial reviewed bundles", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "approved",
      probability: 3,
      impact: 3,
      inherentScore: 9,
      reviewedProbability: 5,
      reviewedImpact: 5,
      reviewedWeight: 1,
      reviewedNilai: 25,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2026-H1", Rendah: 1, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 0 },
  ]);
});

test("buildRiskTrendData keeps explicit zero reviewed values in approved buckets", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "approved",
      probability: 5,
      impact: 4,
      inherentScore: 20,
      reviewedProbability: 1,
      reviewedImpact: 1,
      reviewedWeight: 0,
      reviewedNilai: 0,
      reviewedScore: 0,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2026-H1", Rendah: 1, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 0 },
  ]);
  assert.deepEqual(result.pieData.map((item) => ({ name: item.name, value: item.value })), [
    { name: "Rendah", value: 1 },
    { name: "Sedang", value: 0 },
    { name: "Tinggi", value: 0 },
    { name: "Sangat Tinggi", value: 0 },
  ]);
});

test("buildRiskTrendData keeps non-finalized reviewed drafts on inherent buckets", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "in_approval",
      probability: 3,
      impact: 4,
      inherentScore: 12,
      reviewedProbability: 1,
      reviewedImpact: 1,
      reviewedWeight: 0,
      reviewedNilai: 0,
      reviewedScore: 0,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2026-H1", Rendah: 0, Sedang: 1, Tinggi: 0, "Sangat Tinggi": 0 },
  ]);
});

test("buildRiskTrendData falls back to createdAt-derived semester when assessmentCycle is missing", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      createdAt: "2026-04-01T13:02:24.774Z",
      probability: 2,
      impact: 2,
      inherentScore: 4,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.equal(result.trendData[0]?.period, "2026-H1");
});

test("buildRiskTrendData limits trend rows by selected semester window", () => {
  const risks: RiskTrendSourceItem[] = [
    { assessmentCycle: "2025-H1", probability: 1, impact: 1, inherentScore: 1 },
    { assessmentCycle: "2025-H2", probability: 1, impact: 1, inherentScore: 1 },
    { assessmentCycle: "2026-H1", probability: 1, impact: 1, inherentScore: 1 },
  ];

  const result = buildRiskTrendData(risks, "2s");

  assert.deepEqual(result.trendData.map((item) => item.period), ["2025-H2", "2026-H1"]);
});
