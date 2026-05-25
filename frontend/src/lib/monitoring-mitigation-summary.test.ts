import assert from "node:assert/strict";
import test from "node:test";

const monitoringSummaryLib = await import(
  new URL("./monitoring-mitigation-summary.ts", import.meta.url).href,
);

const {
  buildMonitoringMitigationSummary,
} = monitoringSummaryLib as typeof import("./monitoring-mitigation-summary");

test("buildMonitoringMitigationSummary aggregates active, completed, overdue, and completion rate", () => {
  const result = buildMonitoringMitigationSummary([
    {
      period: "2026-01",
      totalMitigations: 10,
      incidentsCreated: 1,
      mitigationsCompleted: 8,
      overdueMitigations: 2,
    },
    {
      period: "2026-02",
      totalMitigations: 5,
      incidentsCreated: 0,
      mitigationsCompleted: 4,
      overdueMitigations: 1,
    },
  ]);

  assert.equal(result.totalActive, 15);
  assert.equal(result.completed, 12);
  assert.equal(result.overdue, 3);
  assert.equal(result.completionRate, 80);
});

test("buildMonitoringMitigationSummary returns zero completion rate when the dataset is empty", () => {
  const result = buildMonitoringMitigationSummary([]);

  assert.equal(result.totalActive, 0);
  assert.equal(result.completed, 0);
  assert.equal(result.overdue, 0);
  assert.equal(result.completionRate, 0);
});

test("buildMonitoringMitigationSummary keeps overdue-heavy datasets stable", () => {
  const result = buildMonitoringMitigationSummary([
    {
      period: "2026-03",
      totalMitigations: 6,
      incidentsCreated: 2,
      mitigationsCompleted: 1,
      overdueMitigations: 5,
    },
  ]);

  assert.equal(result.totalActive, 6);
  assert.equal(result.completed, 1);
  assert.equal(result.overdue, 5);
  assert.equal(result.completionRate, 16.7);
});
