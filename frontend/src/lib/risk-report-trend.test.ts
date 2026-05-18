import assert from "node:assert/strict";
import test from "node:test";

// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { buildRiskTrendData, type RiskTrendSourceItem } from "./risk-report-trend";

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

test("buildRiskTrendData promotes approved complete bundles to effective score buckets", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "approved",
      probability: 5,
      impact: 5,
      inherentScore: 20,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2026-H1", Rendah: 0, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 1 },
  ]);
});

test("buildRiskTrendData uses base semantics for approved risks", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "approved",
      probability: 3,
      impact: 3,
      inherentScore: 9,
    },
  ];

  const result = buildRiskTrendData(risks, "all");

  assert.deepEqual(result.trendData, [
    { period: "2026-H1", Rendah: 1, Sedang: 0, Tinggi: 0, "Sangat Tinggi": 0 },
  ]);
});

test("buildRiskTrendData handles zero base values for approved risks", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "approved",
      probability: 1,
      impact: 1,
      inherentScore: 0,
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

test("buildRiskTrendData keeps non-finalized drafts on inherent buckets", () => {
  const risks: RiskTrendSourceItem[] = [
    {
      assessmentCycle: "2026-H1",
      status: "assessment_in_review",
      probability: 3,
      impact: 4,
      inherentScore: 12,
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
