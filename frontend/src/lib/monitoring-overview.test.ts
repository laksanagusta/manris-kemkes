import assert from "node:assert/strict";
import test from "node:test";

const overview = await import(new URL("./monitoring-overview.ts", import.meta.url).href);

const organizations = [
  { id: "parent", name: "Parent", createdAt: "" },
  { id: "child-a", name: "Child A", parentId: "parent", createdAt: "" },
  { id: "child-b", name: "Child B", parentId: "parent", createdAt: "" },
];

function makeMonitoring(
  id: string,
  organizationId: string,
  status: "draft" | "final",
) {
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
  assert.equal(rows[0].createdAt, "2026-09-01T03:00:00Z");
  assert.equal(rows[0].updatedAt, "2026-09-01T03:00:00Z");
  assert.equal(rows[1].createdAt, "2026-08-31T03:00:00Z");
  assert.equal(rows[1].finalizedAt, "2026-09-02T03:00:00Z");
  assert.equal(rows[1].updatedAt, "2026-09-03T03:00:00Z");
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
    ["child-a", "child-b"],
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
