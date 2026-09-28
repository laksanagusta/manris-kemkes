import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node native TypeScript tests require the explicit .ts extension.
import {
  buildQuarterlyAnalysis,
  completedReportCycle,
  reportTaskState,
} from "./quarterly-report.ts";
import type {
  QuarterlyReport,
  QuarterlyRisk,
  QuarterlyTask,
} from "../types/quarterly-report.ts";

const risk = (
  id: string,
  extra: Partial<QuarterlyRisk> = {},
): QuarterlyRisk => ({
  id,
  title: id,
  organizationId: "unit-a",
  versionGroupId: id,
  nilai: 12,
  targetProbability: 1,
  targetImpact: 2,
  targetWeight: 1.5,
  targetNilai: 3,
  ...extra,
});
const report = (extra: Partial<QuarterlyReport> = {}): QuarterlyReport => ({
  cycle: "2026-Q1",
  comparisonCycle: "2025-Q4",
  generatedAt: "2026-04-02T00:00:00Z",
  warnings: [],
  organizations: [
    { id: "unit-a", name: "A" },
    { id: "unit-b", name: "B" },
  ],
  risks: [],
  previousRisks: [],
  tasks: [],
  events: [],
  ...extra,
});
const task = (extra: Partial<QuarterlyTask> = {}) =>
  ({
    id: "t1",
    organizationId: "unit-a",
    versionGroupId: "r1",
    riskId: "r1",
    status: "done",
    notes: "Laporan lengkap dan valid",
    reportedAt: "2026-03-01T00:00:00Z",
    dueDate: "2026-03-15T00:00:00Z",
    ...extra,
  }) as QuarterlyTask;

test("completed quarter uses Jakarta and rolls Q1 back to preceding year", () => {
  assert.equal(
    completedReportCycle(new Date("2025-12-31T18:00:00Z")),
    "2025-Q4",
  );
  assert.equal(
    completedReportCycle(new Date("2026-04-01T00:00:00Z")),
    "2026-Q1",
  );
});
test("target denominator pairs final observations; 2/2 with eight unevaluated", () => {
  const risks = Array.from({ length: 10 }, (_, i) =>
    risk(
      String(i),
      i < 2
        ? {
            monitoringStatus: "final",
            monitoringAssessmentCycle: "2026-Q1",
            monitoringObservedNilai: 2.8,
          }
        : {},
    ),
  );
  const result = buildQuarterlyAnalysis(report({ risks }));
  assert.deepEqual(result.summary.target, {
    achieved: 2,
    eligible: 2,
    unavailable: 8,
    rate: 100,
  });
  assert.equal(result.summary.monitoring.rate, 20);
  assert.equal(result.units[1].hasData, false);
  assert.equal(result.units[1].summary.target.rate, null);
});
test("draft and another quarter observations never count; missing target isn't zero", () => {
  const result = buildQuarterlyAnalysis(
    report({
      risks: [
        risk("draft", {
          monitoringStatus: "draft",
          monitoringAssessmentCycle: "2026-Q1",
          monitoringObservedNilai: 1,
        }),
        risk("old", {
          monitoringStatus: "final",
          monitoringAssessmentCycle: "2025-Q4",
          monitoringObservedNilai: 1,
        }),
        risk("no-target", {
          targetProbability: 0,
          targetNilai: 0,
          monitoringStatus: "final",
          monitoringAssessmentCycle: "2026-Q1",
          monitoringObservedNilai: 1,
        }),
      ],
    }),
  );
  assert.equal(result.summary.target.rate, null);
  assert.equal(result.summary.target.unavailable, 3);
  assert.equal(result.summary.monitoring.final, 1);
});
test("new is separate from stable; score movement uses profiles rather than observations", () => {
  const result = buildQuarterlyAnalysis(
    report({
      risks: [
        risk("new"),
        risk("same", { monitoringObservedNilai: 1 }),
        risk("up", { nilai: 15 }),
      ],
      previousRisks: [risk("same"), risk("up", { nilai: 8 }), risk("gone")],
    }),
  );
  assert.deepEqual(result.movement, {
    up: 1,
    down: 0,
    stable: 1,
    new: 1,
    absent: 1,
  });
});
test("done alone does not count; skipped stays in period denominator", () => {
  const result = buildQuarterlyAnalysis(
    report({
      risks: [risk("r1")],
      tasks: [
        task(),
        task({ id: "t2", notes: "" }),
        task({ id: "t3", status: "skipped" }),
      ],
    }),
  );
  assert.equal(result.summary.mitigation.reported, 1);
  assert.equal(result.summary.mitigation.total, 3);
  assert.equal(result.tasks[1].state, "overdue");
  assert.equal(result.tasks[2].state, "skipped");
  assert.equal(
    reportTaskState(
      task({ notes: "pendek" }),
      report().cycle,
      report().generatedAt,
    ),
    "overdue",
  );
});
test("deduplicates events; unknown losses aren't converted to known zero", () => {
  const event = {
    id: "e1",
    organizationId: "unit-a",
    financialLossKnown: false,
    financialLoss: 0,
    linkedRisks: [{ id: "r1" }, { id: "r2" }],
    severity: "high",
    postResponseCondition: "ongoing",
  } as QuarterlyReport["events"][number];
  const result = buildQuarterlyAnalysis(report({ events: [event, event] }));
  assert.equal(result.summary.events.total, 1);
  assert.equal(result.summary.events.unknownLoss, 1);
  assert.equal(result.summary.events.knownLossCount, 0);
  assert.equal(result.summary.events.unlinked, 0);
});

test("a date-only deadline remains open for the full Jakarta day", () => {
  assert.equal(
    reportTaskState(
      task({ status: "pending", dueDate: "2026-03-15" }),
      "2026-Q1",
      "2026-03-15T16:59:59Z",
    ),
    "pending",
  );
  assert.equal(
    reportTaskState(
      task({ status: "pending", dueDate: "2026-03-15" }),
      "2026-Q1",
      "2026-03-15T17:00:00Z",
    ),
    "overdue",
  );
});

test("an old quarter's unreported task becomes overdue after its reporting deadline", () => {
  assert.equal(
    reportTaskState(
      task({ status: "pending", dueDate: "2026-03-31" }),
      "2026-Q1",
      "2026-04-01T00:00:00Z",
    ),
    "overdue",
  );
  assert.equal(
    reportTaskState(
      task({ status: "pending", dueDate: "2026-04-07" }),
      "2026-Q1",
      "2026-09-01T00:00:00Z",
    ),
    "overdue",
  );
});

test("an event linked outside the active scope is not counted as unlinked", () => {
  const event = {
    id: "outside",
    organizationId: "unit-a",
    hasLinkedRisks: true,
    linkedRisks: [],
    financialLossKnown: true,
    financialLoss: 0,
  } as QuarterlyReport["events"][number];
  const result = buildQuarterlyAnalysis(report({ events: [event] }));
  assert.equal(result.summary.events.unlinked, 0);
  assert.equal(result.summary.events.knownLossCount, 1);
});
