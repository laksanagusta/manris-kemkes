import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node native TypeScript tests require the explicit .ts extension.
import {
  buildQuarterlyAnalysis,
  buildRiskManagementCondition,
  buildRiskConditionChartData,
  completedReportCycle,
  reportTaskState,
  riskPopulationLabel,
} from "./quarterly-report.ts";

test("population label changes when the quarter closes in Jakarta", () => {
  assert.equal(
    riskPopulationLabel("2026-Q2", new Date("2026-06-30T16:59:59Z")),
    "Risiko aktif saat ini · Final",
  );
  assert.equal(
    riskPopulationLabel("2026-Q2", new Date("2026-06-30T17:00:00Z")),
    "Risiko aktif akhir periode · Final",
  );
});
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


test("condition preserves critical risk warnings despite complete reporting", () => {
  const profiles = [risk("r1", { nilai: 20, mitigations: [{ action: "Mitiger", owner: "A" }],
    monitoringStatus: "final", monitoringAssessmentCycle: "2026-Q1", monitoringObservedNilai: 2 })];
  const result = buildRiskManagementCondition(report({ tasks: [task()] }), profiles, []);
  assert.equal(result.status, "attention");
  assert.equal(result.extreme, 1);
  assert.equal(result.summary.mitigation.rate, 100);
  assert.equal(result.metrics[1].numerator, 1);
});
test("condition does not count existing controls or blank actions as plans", () => {
  const profiles = [risk("r1", { mitigations: [{ action: "Existing", owner: "A", isExistingControl: true }, { action: "  ", owner: "A" }] })];
  assert.equal(buildRiskManagementCondition(report(), profiles, []).missingPlans, 1);
});
test("condition uses active snapshots including restored risks and filters historical tasks", () => {
  const active = risk("restored", { nilai: 7, archivedInPeriod: true });
  const data = report({ risks: [risk("archived"), active], tasks: [task(), task({ id: "active", riskId: "restored", versionGroupId: "restored" })] });
  const result = buildRiskManagementCondition(data, [active], []);
  assert.equal(result.total, 1);
  assert.equal(result.summary.mitigation.total, 1);
  assert.equal(result.status, "incomplete");
});
test("condition distinguishes empty from incomplete and zero denominators", () => {
  assert.equal(buildRiskManagementCondition(report(), [], []).status, "empty");
  const result = buildRiskManagementCondition(report(), [risk("r1", { nilai: 3 })], []);
  assert.equal(result.status, "incomplete");
  assert.equal(result.metrics[1].denominator, 0);
  assert.equal(result.metrics[4].denominator, 0);
});
test("condition requires valid observations and no warnings for reassuring status", () => {
  const profiles = [risk("r1", { nilai: 3, monitoringStatus: "final", monitoringAssessmentCycle: "2026-Q1", monitoringObservedNilai: 2 })];
  assert.equal(buildRiskManagementCondition(report(), profiles, profiles).status, "within");
  assert.equal(buildRiskManagementCondition(report({ warnings: ["Lifecycle incomplete"] }), profiles, profiles).status, "incomplete");
  assert.equal(buildRiskManagementCondition(report(), [risk("invalid", { nilai: 0 })], []).status, "incomplete");
});


test("condition charts preserve unknown scores, denominators and comparable movements", () => {
  const active = [risk("up", { nilai: 20 }), risk("down", { nilai: 5 }), risk("new", { nilai: 3 }), risk("missing", { nilai: 0 })];
  const previous = [risk("up", { nilai: 10 }), risk("down", { nilai: 15 }), risk("missing", { nilai: 0 }), risk("gone", { nilai: 5 })];
  const result = buildRiskConditionChartData(report(), active, previous);
  assert.equal(result.composition[1].unknown, 1);
  assert.equal(result.composition[1].extreme, 1);
  assert.equal(result.indicators[0].denominator, 3);
  assert.equal(result.indicators[4].value, null);
  assert.deepEqual(result.movement.map((row) => row.value), [1, 1, 0, 1, 1, 1]);
});
