import assert from "node:assert/strict";
import test from "node:test";
import type { RiskMonitoringDetail } from "../types/risk-monitoring";

const overview: typeof import("./monitoring-overview") = await import(new URL("./monitoring-overview.ts", import.meta.url).href);

const organizations = [
  { id: "parent", name: "Parent", createdAt: "" },
  { id: "child-a", name: "Child A", parentId: "parent", createdAt: "" },
  { id: "child-b", name: "Child B", parentId: "parent", createdAt: "" },
];

function makeMonitoring(
  id: string,
  organizationId: string,
  status: "draft" | "final" | "superseded",
): RiskMonitoringDetail {
  return {
    id,
    sourceRiskId: `risk-${id}`,
    versionGroupId: `group-${id}`,
    assessmentCycle: "2026-Q3",
    status,
    mode: "score_only",
    sourceProbability: 2,
    sourceImpact: 3,
    sourceWeight: 1,
    sourceNilai: 6,
    sourceLevel: "sedang",
    sourceVersionNumber: 1,
    observedProbability: 1,
    observedImpact: 2,
    observedWeight: 1,
    observedNilai: status === "final" ? 2 : 4,
    observedLevel: status === "final" ? "rendah" : "sedang",
    conclusion: "",
    mitigationProgressSummary: "",
    mitigationCompletionPercent: status === "final" ? 75 : 25,
    draftTitle: `Risk ${id}`,
    draftDescription: "",
    draftCategory: "operasional",
    draftCause: [],
    draftRiskSource: "internal",
    draftControllability: "C",
    draftImpactDesc: [],
    draftExistingControl: "",
    draftControlEffectiveness: "",
    draftTreatmentOption: "mitigasi",
    profileChangeSummary: [],
    changeReason: "",
    startedAt: "2026-09-01T03:00:00Z",
    finalizedAt: status === "final" ? "2026-09-02T03:00:00Z" : null,
    createdAt: status === "final" ? "2026-08-31T03:00:00Z" : "",
    updatedAt: status === "final" ? "2026-09-03T03:00:00Z" : "",
    sourceRisk: {
      id: `risk-${id}`,
      code: `R-${id}`,
      title: `Risk ${id}`,
      organizationId,
      orgName: organizationId,
      versionGroupId: `group-${id}`,
      inherentScore: 6,
      nilai: 6,
    } as never,
  };
}

test("buildMonitoringTransactionRows maps draft and final transactions directly", () => {
  const rows = overview.buildMonitoringTransactionRows(
    [makeMonitoring("235", "child-a", "draft"), makeMonitoring("236", "child-b", "final")],
    organizations,
  );

  assert.deepEqual(
    rows.map((row) => row.status),
    ["in_progress", "finalized"],
  );
  assert.equal(rows[0].code, "R-235");
  assert.equal(rows[0].organizationId, "child-a");
  assert.equal(rows[0].observedScore, 4);
  assert.equal(rows[0].mitigationCompletionPercent, 25);
  assert.equal(rows[0].createdAt, null);
  assert.equal(rows[0].updatedAt, "2026-09-01T03:00:00Z");
  assert.equal(rows[1].createdAt, "2026-08-31T03:00:00Z");
  assert.equal(rows[1].finalizedAt, "2026-09-02T03:00:00Z");
  assert.equal(rows[1].updatedAt, "2026-09-03T03:00:00Z");
});

test("superseded monitoring remains historical and is not counted as a draft", () => {
  const rows = overview.buildMonitoringTransactionRows(
    [makeMonitoring("old", "child-a", "superseded"), makeMonitoring("new", "child-a", "final")],
    organizations,
  );

  assert.equal(rows[0].status, "superseded");
  assert.equal(overview.getMonitoringStatusLabel(rows[0].status), "Digantikan");
  const summary = overview.buildMonitoringOrganizationSummaries(rows, organizations, "parent")
    .find((item) => item.id === "child-a");
  assert.equal(summary?.inProgress, 0);
  assert.equal(summary?.finalized, 1);
  assert.equal(overview.filterMonitoringRows(rows, "parent", organizations, "", "in_progress").length, 0);
  assert.deepEqual(
    overview.filterMonitoringRows(rows, "parent", organizations, "", "superseded").map((row) => row.id),
    ["old"],
  );
  assert.equal(overview.parseMonitoringQueryState(new URLSearchParams("status=superseded")).status, "all");
});

test("filter and organization summaries include descendants for a parent scope", () => {
  const rows = overview.buildMonitoringTransactionRows(
    [makeMonitoring("1", "child-a", "draft"), makeMonitoring("2", "child-b", "final")],
    organizations,
  );

  const filtered = overview.filterMonitoringRows(
    rows,
    "parent",
    organizations,
    "",
    "all",
  );
  const summaries = overview.buildMonitoringOrganizationSummaries(
    rows,
    organizations,
    "parent",
  );
  const parentSummary = summaries.find((summary) => summary.id === "parent");

  assert.equal(filtered.length, 2);
  assert.deepEqual(
    filtered.map((row) => row.organizationId),
    ["child-b", "child-a"],
  );
  assert.deepEqual(
    parentSummary && {
      total: parentSummary.total,
      finalized: parentSummary.finalized,
    },
    { total: 0, finalized: 0 },
  );

  assert.deepEqual(
    summaries.map((summary) => ({
      id: summary.id,
      total: summary.total,
      finalized: summary.finalized,
    })),
    [
      { id: "child-a", total: 1, finalized: 0 },
      { id: "child-b", total: 1, finalized: 1 },
      { id: "parent", total: 0, finalized: 0 },
    ],
  );
});

test("monitoring defaults to all cycles and keeps that default out of the URL", () => {
  const state = overview.parseMonitoringQueryState(
    new URLSearchParams(),
  );

  assert.equal(state.cycle, "all");
  assert.equal(
    overview.buildMonitoringQueryString(state),
    "",
  );
});

test("main monitoring collection sorts creation time before status or score", () => {
  const olderDraft = { ...makeMonitoring("old", "child-a", "draft"), createdAt: "2026-09-01T00:00:00Z" };
  const newerFinal = { ...makeMonitoring("new", "child-b", "final"), createdAt: "2026-10-01T00:00:00Z" };
  const rows = overview.buildMonitoringTransactionRows([olderDraft, newerFinal], organizations);
  const filtered = overview.filterMonitoringRows(rows, "parent", organizations, "", "all");
  assert.deepEqual(filtered.map(row => row.id), ["new", "old"]);
});

 test("monitoring creation order uses createdAt rather than startedAt", () => {
  const older = makeMonitoring("older", "child-a", "final");
  older.createdAt = "2026-09-01T00:00:00Z";
  older.startedAt = "2026-11-01T00:00:00Z";
  const newer = makeMonitoring("newer", "child-b", "final");
  newer.createdAt = "2026-10-01T00:00:00Z";
  newer.startedAt = "2026-08-01T00:00:00Z";
  const rows = overview.buildMonitoringTransactionRows([older, newer], organizations);
  assert.deepEqual(overview.filterMonitoringRows(rows, "parent", organizations, "", "all").map(row => row.id), ["newer", "older"]);
});
