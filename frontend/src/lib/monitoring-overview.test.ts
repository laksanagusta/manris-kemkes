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
  assert.equal(rows[0].createdAt, "2026-09-01T03:00:00Z");
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

test("needs monitoring filter combines actionable starts and drafts in the normal table",()=>{
 const item={key:"start-a",kind:"monitoring_start",targetId:"risk-a",riskId:"risk-a",riskCode:"R-a",riskTitle:"Distribution",period:"2026-Q3",dueDate:"",responsibility:"unit",createdAt:"2026-10-01",actionLabel:"Mulai pemantauan"} as const;
 const existing=overview.buildMonitoringTransactionRows([makeMonitoring("draft-a","child-a","draft"),makeMonitoring("final-a","child-a","final")],organizations);
 const draftItem={...item,key:"draft-a",kind:"monitoring_draft",targetId:"draft-a",riskId:"risk-draft-a"} as const;
 const rows=overview.buildMonitoringWorkRows([item,draftItem],existing,"child-a","Child A");
 assert.equal(rows.length,2);
 assert.equal(rows[0].status,"not_started");
 assert.equal(rows[0].mitigationCompletionPercent,null);
 assert.equal(rows[1].sourceScore,6);
 const selected=overview.filterMonitoringRows(rows,"parent",organizations,"","needs_monitoring");
 assert.equal(selected.length,2);
 assert.equal(overview.filterMonitoringRows(rows,"parent",organizations,"Distribution","needs_monitoring").length,2);
 assert.equal(overview.parseMonitoringQueryState(new URLSearchParams("status=needs_monitoring")).status,"needs_monitoring");
});

test("native monitoring filter is available for unit operators and round-trips URL state",()=>{
 assert.equal(overview.getMonitoringStatusOptions("unit").some(option=>option.value==="needs_monitoring"),true);
 assert.equal(overview.getMonitoringStatusOptions("reviewer").some(option=>option.value==="needs_monitoring"),false);
 const state=overview.parseMonitoringQueryState(new URLSearchParams("status=needs_monitoring&cycle=2026-Q3&q=distribution&page=2"));
 assert.equal(overview.buildMonitoringQueryString(state),"q=distribution&status=needs_monitoring&cycle=2026-Q3&page=2");
});

test("native monitoring page is retained until its rows finish loading",()=>{
 assert.equal(overview.getMonitoringPage(2,0,25,true),2);
 assert.equal(overview.getMonitoringPage(2,60,25,false),2);
 assert.equal(overview.getMonitoringPage(4,60,25,false),3);
 assert.equal(overview.getMonitoringPage(2,0,25,false),1);
});
