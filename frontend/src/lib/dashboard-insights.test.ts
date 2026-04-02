import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutiveTrendData,
  buildMovementChartData,
  buildMovementSnapshotData,
  buildTopRiskBadgeMap,
  buildUnitExposureData,
} from "./dashboard-insights.ts";

test("buildUnitExposureData ranks units by weighted exposure score", () => {
  const result = buildUnitExposureData([
    { orgName: "Direktorat A", probability: 5, impact: 4 },
    { orgName: "Direktorat A", probability: 4, impact: 3 },
    { orgName: "Direktorat B", probability: 2, impact: 3 },
  ]);

  assert.deepEqual(result, [
    { orgName: "Direktorat A", exposureScore: 8, low: 0, medium: 0, high: 1, extreme: 1 },
    { orgName: "Direktorat B", exposureScore: 2, low: 0, medium: 1, high: 0, extreme: 0 },
  ]);
});

test("buildMovementChartData summarizes up down and stable comparison counts", () => {
  const result = buildMovementChartData([
    { code: "R-001", movement: "up" },
    { code: "R-002", movement: "up" },
    { code: "R-003", movement: "down" },
    { code: "R-004", movement: "stable" },
  ]);

  assert.deepEqual(result, [
    { label: "Naik", value: 2, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: 1, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: 1, fill: "oklch(0.60 0.02 265 / 55%)" },
  ]);
});

test("buildExecutiveTrendData keeps only high and extreme counts plus weighted exposure", () => {
  const result = buildExecutiveTrendData([
    { assessmentCycle: "2025-H2", probability: 3, impact: 4 },
    { assessmentCycle: "2025-H2", probability: 5, impact: 4 },
    { assessmentCycle: "2026-H1", probability: 2, impact: 2 },
    { assessmentCycle: "2026-H1", probability: 5, impact: 4 },
  ]);

  assert.deepEqual(result, [
    { period: "2025-H2", high: 1, extreme: 1, exposureScore: 8 },
    { period: "2026-H1", high: 0, extreme: 1, exposureScore: 6 },
  ]);
});

test("buildTopRiskBadgeMap marks movement overdue and newly introduced cycle risks", () => {
  const result = buildTopRiskBadgeMap({
    topRisks: [{ code: "R-001" }, { code: "R-002" }, { code: "R-003" }],
    allRisks: [
      { code: "R-001", nextReviewDate: "2026-03-01", assessmentCycle: "2026-H1" },
      { code: "R-002", nextReviewDate: "2026-12-01", assessmentCycle: "2026-H1" },
      { code: "R-003", nextReviewDate: "2026-12-01", assessmentCycle: "2026-H1" },
    ],
    comparisons: [
      { code: "R-001", movement: "up" },
      { code: "R-002", movement: "stable" },
    ],
    currentCycle: "2026-H1",
    now: new Date("2026-04-02T00:00:00.000Z"),
  });

  assert.deepEqual(result, {
    "R-001": ["Naik level", "Overdue"],
    "R-002": [],
    "R-003": ["Baru"],
  });
});

test("buildUnitExposureData and buildMovementChartData return empty-friendly arrays", () => {
  assert.deepEqual(buildUnitExposureData([]), []);
  assert.deepEqual(buildMovementChartData([]), [
    { label: "Naik", value: 0, fill: "oklch(0.70 0.18 40)" },
    { label: "Turun", value: 0, fill: "oklch(0.72 0.17 155)" },
    { label: "Stabil", value: 0, fill: "oklch(0.60 0.02 265 / 55%)" },
  ]);
});

test("buildExecutiveTrendData sorts semester output chronologically for overview charts", () => {
  const result = buildExecutiveTrendData([
    { assessmentCycle: "2026-H1", probability: 4, impact: 3 },
    { assessmentCycle: "2025-H2", probability: 4, impact: 4 },
  ]);

  assert.deepEqual(result.map((item) => item.period), ["2025-H2", "2026-H1"]);
});

test("buildMovementSnapshotData classifies new up down stable and removed risks", () => {
  const result = buildMovementSnapshotData({
    currentRisks: [
      { code: "R-001" },
      { code: "R-002" },
      { code: "R-003" },
      { code: "R-004" },
    ],
    previousRisks: [
      { code: "R-002" },
      { code: "R-003" },
      { code: "R-004" },
      { code: "R-005" },
    ],
    comparisons: [
      { code: "R-002", movement: "up" },
      { code: "R-003", movement: "down" },
      { code: "R-004", movement: "stable" },
    ],
  });

  assert.deepEqual(result, [
    { key: "new", label: "Baru", value: 1 },
    { key: "up", label: "Naik", value: 1 },
    { key: "down", label: "Turun", value: 1 },
    { key: "stable", label: "Stabil", value: 1 },
    { key: "removed", label: "Keluar", value: 1 },
  ]);
});
